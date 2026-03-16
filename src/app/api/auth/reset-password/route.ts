import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createHash } from "crypto";
import prisma from "@/lib/db/client";
import { z } from "zod";
import { rateLimit } from "@/lib/middleware/rate-limit";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Limit reset attempts: 10 per 15 minutes per IP
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

export async function POST(request: NextRequest) {
  const rateLimitError = resetPasswordLimiter(request);
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Hash submitted token and look up the hash (H-4: tokens stored hashed)
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: tokenHash },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Check expiry
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      // Clear the expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(parsed.data.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // C-3: Instruct client to sign out so stale JWTs are discarded
    return NextResponse.json({
      message: "Password reset successfully",
      requireSignOut: true,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
