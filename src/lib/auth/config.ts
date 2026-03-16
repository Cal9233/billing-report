import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/db/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(parsed.data.password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          organizationSlug: user.organization.slug,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }

      // C-3: Reject token if password was changed after the token was issued.
      // token.iat is the JWT issued-at timestamp (seconds since epoch).
      if (token.id && token.iat) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            passwordChangedAt: true,
            role: true,
            organizationId: true,
            mustChangePassword: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        });

        if (dbUser?.passwordChangedAt) {
          const tokenIssuedAt = (token.iat as number) * 1000; // convert to ms
          if (dbUser.passwordChangedAt.getTime() > tokenIssuedAt) {
            // Password was changed after this token was issued — invalidate
            return {} as typeof token;
          }
        }

        // Also hydrate org data for JWTs issued before multi-tenancy migration
        if (dbUser?.organization && !token.organizationId) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.organizationName = dbUser.organization.name;
          token.organizationSlug = dbUser.organization.slug;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.organizationSlug = token.organizationSlug as string;
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (L-2: reduced from 30 days)
  },
});
