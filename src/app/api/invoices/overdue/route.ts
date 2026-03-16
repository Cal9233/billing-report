import { NextRequest, NextResponse } from "next/server";
import {
  getOverdueSummary,
  updateOverdueStatuses,
} from "@/lib/services/overdue.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const summary = await getOverdueSummary(organizationId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Get overdue summary error:", err);
    return NextResponse.json(
      { error: "Failed to get overdue summary" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const updated = await updateOverdueStatuses(organizationId);
    return NextResponse.json({
      message: `Updated ${updated} invoice statuses to overdue`,
      updatedCount: updated,
    });
  } catch (err) {
    console.error("Update overdue status error:", err);
    return NextResponse.json(
      { error: "Failed to update overdue statuses" },
      { status: 500 }
    );
  }
}
