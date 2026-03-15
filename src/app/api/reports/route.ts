import { NextResponse } from "next/server";
import { generateReport } from "@/lib/services/report.service";

export async function GET() {
  try {
    const report = await generateReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
