import { auth } from "@/lib/auth/config";
import { csrfProtect } from "@/lib/middleware/csrf";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/auth/login", "/api/csrf-token"];
const authRoutes = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow NextAuth API routes to handle their own auth
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    // If already authenticated, skip login and go to dashboard
    const session = await auth();
    if (session && authRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
