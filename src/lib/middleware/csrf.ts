import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";
const CSRF_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Signed CSRF token approach (stateless double-submit pattern).
 *
 * Token format: `<timestamp>.<random>.<signature>`
 * - timestamp: Unix ms when token was created (for expiry check)
 * - random: 32 bytes hex
 * - signature: HMAC-SHA256(timestamp.random, AUTH_SECRET)
 *
 * The cookie is NOT HttpOnly so the client JS can read it and
 * submit it as the x-csrf-token header (double-submit pattern).
 */

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is required for CSRF token signing");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
}

export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(32).toString("hex");
  const payload = `${timestamp}.${random}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function validateCSRFToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [timestamp, random, signature] = parts;

  // Verify signature using constant-time comparison
  const expectedSignature = sign(`${timestamp}.${random}`);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return false;
  }

  // Check expiry
  const created = parseInt(timestamp, 10);
  if (isNaN(created) || Date.now() - created > CSRF_TOKEN_LIFETIME_MS) {
    return false;
  }

  return true;
}

export function csrfProtect(request: NextRequest): NextResponse | null {
  // Only check POST, PUT, DELETE requests
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    return null;
  }

  // Skip if no session (unauthenticated)
  // Check both production (__Secure- prefix) and development cookie names
  const cookie =
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token");
  if (!cookie) {
    return null;
  }

  // Double-submit: verify that the header token matches the cookie token
  // AND that the token signature is valid
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return new NextResponse("CSRF token validation failed", { status: 403 });
  }

  // Constant-time comparison of header vs cookie
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);
  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return new NextResponse("CSRF token validation failed", { status: 403 });
  }

  // Validate the token signature and expiry
  if (!validateCSRFToken(headerToken)) {
    return new NextResponse("CSRF token validation failed", { status: 403 });
  }

  return null;
}
