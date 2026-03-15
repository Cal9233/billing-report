import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken, storeCSRFToken } from "@/lib/middleware/csrf";
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
  storeCSRFToken(token);

  return NextResponse.json(
    { token },
    {
      headers: {
        "Set-Cookie": `csrf-token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
      },
    }
  );
}
