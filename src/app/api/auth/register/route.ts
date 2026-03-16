import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/db/client";
import { z } from "zod";
import { protectAPI } from "@/lib/middleware/api-protection";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  inviteToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Determine organizationId and role from either:
    // 1. An admin session (admin inviting a team member inline), OR
    // 2. A valid invite token
    let organizationId: string;
    let role = "user";

    if (parsed.data.inviteToken) {
      // Validate invite token
      const invite = await prisma.invite.findUnique({
        where: { token: parsed.data.inviteToken },
      });

      if (!invite) {
        return NextResponse.json(
          { error: "Invalid invite token" },
          { status: 400 }
        );
      }

      if (invite.usedAt) {
        return NextResponse.json(
          { error: "Invite token has already been used" },
          { status: 400 }
        );
      }

      if (new Date() > invite.expiresAt) {
        return NextResponse.json(
          { error: "Invite token has expired" },
          { status: 400 }
        );
      }

      // If invite was scoped to an email, verify it matches
      if (invite.email && invite.email !== parsed.data.email) {
        return NextResponse.json(
          { error: "This invite was issued for a different email address" },
          { status: 400 }
        );
      }

      organizationId = invite.organizationId;
      role = invite.role;

      // Mark invite as used
      await prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
    } else {
      // No invite token — check if caller is an authenticated admin
      const result = await protectAPI(request, { roles: ["admin"] });
      if (result.error) {
        return NextResponse.json(
          { error: "Registration requires a valid invite token or an admin session" },
          { status: 403 }
        );
      }
      organizationId = result.session.user.organizationId;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(parsed.data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password: hashedPassword,
        name: parsed.data.name,
        role,
        organizationId,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
