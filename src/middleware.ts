import { auth } from "@/lib/auth/config";
import { csrfProtect } from "@/lib/middleware/csrf";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/auth/login",
  "/auth/request-access",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/csrf-token",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

const authRoutes = ["/auth/login", "/auth/register"];

// Routes accessible to authenticated users who must change their password
const changePasswordRoutes = [
  "/auth/change-password",
  "/api/auth/change-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow NextAuth API routes to handle their own auth
  if (pathname.startsWith("/api/auth/") && !changePasswordRoutes.includes(pathname) && !publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    // If already authenticated, skip login and go to dashboard
    const session = await auth();
    if (session && authRoutes.some((route) => pathname.startsWith(route))) {
      // But if they must change password, redirect to change-password instead
      if (session.user?.mustChangePassword) {
        return NextResponse.redirect(new URL("/auth/change-password", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Allow change-password routes through for authenticated users
  if (changePasswordRoutes.includes(pathname)) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  // Check CSRF for state-changing requests
  const csrfError = csrfProtect(request);
  if (csrfError) {
    return csrfError;
  }

  const session = await auth();

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change: redirect all routes to /auth/change-password
  if (session.user?.mustChangePassword) {
    return NextResponse.redirect(new URL("/auth/change-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
