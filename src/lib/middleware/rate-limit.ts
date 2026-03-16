import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// LIMITATION: In-memory store — rate limits are per-process and reset on restart.
// In a multi-instance deployment, each instance tracks its own counters independently,
// so effective limits are multiplied by the number of instances.
// For production multi-instance deployments, replace with Redis or a shared store.
const rateLimits = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

function getClientId(request: NextRequest): string {
  // Use x-forwarded-for header or a default identifier
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0] || "unknown";
  return ip;
}

export function rateLimit(
  config: Partial<RateLimitConfig> = {}
): (request: NextRequest) => NextResponse | null {

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (request: NextRequest): NextResponse | null => {
    const clientId = getClientId(request);
    const now = Date.now();

    let entry = rateLimits.get(clientId);

    // Check if we need to reset the window
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + finalConfig.windowMs,
      };
      rateLimits.set(clientId, entry);
      return null;
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > finalConfig.maxRequests) {
      const retryAfter = Math.ceil(
        (entry.resetAt - now) / 1000
      );
      return new NextResponse("Rate limit exceeded", {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": finalConfig.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": entry.resetAt.toString(),
        },
      });
    }

    // Return null to continue processing
    return null;
  };
}

export function createAPIRateLimiter(
  config: Partial<RateLimitConfig> = {}
): (request: NextRequest) => NextResponse | null {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute for API
    maxRequests: 30,
    ...config,
  });
}

export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}

// Cleanup expired entries every minute
setInterval(cleanupExpiredRateLimits, 60 * 1000);
