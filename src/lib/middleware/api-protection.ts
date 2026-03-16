import { NextRequest, NextResponse } from "next/server";
import { createAPIRateLimiter } from "./rate-limit";
import { auth } from "@/lib/auth/config";
import type { SessionUser } from "@/types";

const apiRateLimiter = createAPIRateLimiter();

export interface ProtectAPIOptions {
  /** Allowed roles. If omitted, any authenticated user is allowed. */
  roles?: string[];
}

export interface ProtectedSession {
  user: SessionUser;
}

/**
 * Protects an API route: checks rate limit, authentication, and optional role enforcement.
 * Returns null on success (caller proceeds) or a NextResponse error.
 * On success, the extracted session is attached to the returned object for the caller to use.
 */
export async function protectAPI(
  request: NextRequest,
  options?: ProtectAPIOptions
): Promise<{ error: NextResponse } | { error: null; session: ProtectedSession }> {
  // Check rate limit
  const rateLimitError = apiRateLimiter(request);
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  // Check authentication
  const authSession = await auth();
  if (!authSession?.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const user = authSession.user as any;

  // Check required fields from multi-tenant session
  if (!user.organizationId) {
    return {
      error: NextResponse.json(
        { error: "User is not associated with an organization" },
        { status: 403 }
      ),
    };
  }

  // Check role if specified
  if (options?.roles && options.roles.length > 0) {
    const userRole = user.role || "user";
    if (!options.roles.includes(userRole)) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: insufficient permissions" },
          { status: 403 }
        ),
      };
    }
  }

  return {
    error: null,
    session: {
      user: {
        id: user.id,
        email: user.email!,
        name: user.name,
        role: user.role || "user",
        organizationId: user.organizationId,
        organizationName: user.organizationName || "",
        organizationSlug: user.organizationSlug || "",
      },
    },
  };
}

/**
 * Legacy helper: returns null if authorized, NextResponse error if not.
 * Use this for backward compatibility where callers just check `if (error) return error`.
 */
export async function protectAPILegacy(
  request: NextRequest,
  options?: ProtectAPIOptions
): Promise<NextResponse | null> {
  const result = await protectAPI(request, options);
  if (result.error) return result.error;
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
