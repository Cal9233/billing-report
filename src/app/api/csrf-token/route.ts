import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/middleware/csrf";
import { auth } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  // Only issue tokens to authenticated users
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = generateCSRFToken();

  // Cookie is NOT HttpOnly — double-submit pattern requires JS to read it
  // and send it back as the x-csrf-token header.
  return NextResponse.json(
    { token },
    {
      headers: {
        "Set-Cookie": `csrf-token=${token}; Path=/; Secure; SameSite=Strict; Max-Age=86400`,
      },
    }
  );
}
