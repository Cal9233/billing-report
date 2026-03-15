import { auth } from "@/lib/auth/config";
import { csrfProtect } from "@/lib/middleware/csrf";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/auth/login", "/api/auth/register", "/api/csrf-token"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
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
