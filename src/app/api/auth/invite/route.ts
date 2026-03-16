import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { protectAPI } from "@/lib/middleware/api-protection";

const inviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).default("user"),
  expiresInHours: z.number().min(1).max(720).default(72), // default 3 days, max 30 days
});

/** SHA-256 hash for deterministic invite token lookup */
function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/invite — admin-only: generate an invite token
export async function POST(request: NextRequest) {
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        email: parsed.data.email || null,
        token: tokenHash,
        role: parsed.data.role,
        organizationId,
        expiresAt,
      },
    });

    // Build invite URL — the frontend will handle the registration form
    const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/auth/login?invite=${rawToken}`;

    // Only return inviteUrl, never the raw token separately
    return NextResponse.json(
      {
        message: "Invite created successfully",
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
          inviteUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invite creation error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// GET /api/auth/invite — admin-only: list active invites for the org
export async function GET(request: NextRequest) {
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const invites = await prisma.invite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        // token hash is not returned — no plaintext token in list response
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("List invites error:", error);
    return NextResponse.json(
      { error: "Failed to list invites" },
      { status: 500 }
    );
  }
}
