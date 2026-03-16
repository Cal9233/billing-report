import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAccessRequestNotification } from "@/lib/services/email.service";

// ---------------------------------------------------------------------------
// In-memory rate-limit store: IP -> list of request timestamps
// In production, swap for Redis or a persistent store.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, number[]>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];

  // Evict entries older than the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  return false;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const requestAccessSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(254, "Email must be 254 characters or fewer")
    .transform((v) => v.toLowerCase().trim()),
});

// ---------------------------------------------------------------------------
// POST /api/auth/request-access
// Public — no auth required. Rate-limited to 3 requests per IP per hour.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Resolve client IP (respects X-Forwarded-For behind a reverse proxy)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  // Parse body safely
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = requestAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid request data.",
          details: parsed.error.errors,
        },
      },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const submittedAt = new Date().toISOString();

  // Attempt to email the admin; log as fallback if SMTP is not configured.
  const sent = await sendAccessRequestNotification(email, submittedAt);

  if (!sent) {
    console.warn(
      `[request-access] Email delivery failed — logging request. email=${email} submittedAt=${submittedAt}`
    );
  }

  // Always return success to the requester (don't leak whether email worked).
  return NextResponse.json(
    { message: "Your access request has been submitted. An administrator will contact you shortly." },
    { status: 200 }
  );
}
