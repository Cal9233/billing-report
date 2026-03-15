import { NextResponse } from "next/server";
import { generateReport } from "@/lib/services/report.service";

export async function GET() {
  try {
    const data = await generateReport();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: { code: "REPORT_GENERATION_FAILED", message: "Failed to generate report data" } },
      { status: 500 }
    );
  }
}
