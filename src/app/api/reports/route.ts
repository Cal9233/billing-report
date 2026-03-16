import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/services/report.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const data = await generateReport(organizationId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: { code: "REPORT_GENERATION_FAILED", message: "Failed to generate report data" } },
      { status: 500 }
    );
  }
}
