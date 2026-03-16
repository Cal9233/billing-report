import { NextRequest, NextResponse } from "next/server";
import { listPayments } from "@/lib/services/payment.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const method = searchParams.get("method") || undefined;

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "page must be a positive integer" } },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "limit must be a positive integer" } },
        { status: 400 }
      );
    }

    if (search !== undefined && search.length > 200) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "search query too long (max 200)" } },
        { status: 400 }
      );
    }

    const validMethods = ["cash", "check", "credit_card", "bank_transfer", "wire", "ach", "other"];
    if (method !== undefined && !validMethods.includes(method)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: `Invalid method. Must be one of: ${validMethods.join(", ")}` } },
        { status: 400 }
      );
    }

    const data = await listPayments(organizationId, { search, method }, page, limit);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch payments:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}
