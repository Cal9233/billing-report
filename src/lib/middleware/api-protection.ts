import { NextRequest, NextResponse } from "next/server";
import { createAPIRateLimiter } from "./rate-limit";
import { auth } from "@/lib/auth/config";

const apiRateLimiter = createAPIRateLimiter();

export async function protectAPI(request: NextRequest): Promise<NextResponse | null> {
  // Check rate limit
  const rateLimitError = apiRateLimiter(request);
  if (rateLimitError) {
    return rateLimitError;
  }

  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export async function protectPublicAPI(request: NextRequest): Promise<NextResponse | null> {
  // Only check rate limit for public APIs
  const rateLimitError = apiRateLimiter(request);
  if (rateLimitError) {
    return rateLimitError;
  }

  return null;
}
