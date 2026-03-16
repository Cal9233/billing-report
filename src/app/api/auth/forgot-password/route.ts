import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import prisma from "@/lib/db/client";
import { z } from "zod";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { sendPasswordResetEmail } from "@/lib/services/email.service";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// 3 requests per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
});

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitError = forgotPasswordLimiter(request);
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Always return success to avoid email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with that email, a password reset link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      return successResponse;
    }

    // DB-level rate check: limit to 3 reset requests per email per hour.
    // If the user already has a non-expired reset token with an expiry in the
    // future, that means a reset was recently requested. We count how recently
    // the token was set by checking if passwordResetExpires is still valid.
    // For a more robust check we look at whether a token was already issued
    // within the last hour (expiry is set 1h ahead, so if expiry > now it was
    // issued within the last hour).
    if (user.passwordResetExpires && new Date() < user.passwordResetExpires) {
      // A reset token was already issued within the last hour for this email.
      // Still return success to prevent enumeration, but skip issuing a new token.
      return successResponse;
    }

    // Generate a secure random token, store SHA-256 hash (H-4)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expires,
      },
    });

    const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

    // Send the email (fire-and-forget — don't block response on email delivery)
    sendPasswordResetEmail(parsed.data.email, resetUrl).catch((err) => {
      console.error("Failed to send password reset email:", err);
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
