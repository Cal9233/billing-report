import { NextRequest, NextResponse } from "next/server";
import { exportInvoices } from "@/lib/services/backup.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const format = request.nextUrl.searchParams.get("format") as
      | "csv"
      | "json"
      | null;

    const csv = await exportInvoices({
      format: format || "csv",
      includeLineItems: true,
    });

    const filename = `invoices_${new Date().toISOString().split("T")[0]}.${format || "csv"}`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": format === "json" ? "application/json" : "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
