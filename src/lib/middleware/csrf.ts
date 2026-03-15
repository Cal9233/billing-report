import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Simple in-memory CSRF token store (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

const CSRF_TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function validateCSRFToken(token: string): boolean {
  const stored = csrfTokens.get(token);
  if (!stored) {
    return false;
  }

  // Check if token has expired
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(token);
    return false;
  }

  return stored.token === token;
}

export function storeCSRFToken(token: string): void {
  csrfTokens.set(token, {
    token,
    expiresAt: Date.now() + CSRF_TOKEN_LIFETIME,
  });

  // Clean up expired tokens periodically
  if (csrfTokens.size > 10000) {
    for (const [key, value] of csrfTokens.entries()) {
      if (Date.now() > value.expiresAt) {
        csrfTokens.delete(key);
      }
    }
  }
}

export function csrfProtect(request: NextRequest): NextResponse | null {
  // Only check POST, PUT, DELETE requests
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    return null;
  }

  // Skip if no session (unauthenticated)
  const cookie = request.cookies.get("__Secure-authjs.session-token");
  if (!cookie) {
    return null;
  }

  // Get CSRF token from header
  const csrfToken = request.headers.get(CSRF_HEADER);
  if (!csrfToken || !validateCSRFToken(csrfToken)) {
    return new NextResponse("CSRF token validation failed", { status: 403 });
  }

  return null;
}
