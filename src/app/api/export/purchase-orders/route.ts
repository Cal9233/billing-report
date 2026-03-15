import { NextRequest, NextResponse } from "next/server";
import { exportPurchaseOrders } from "@/lib/services/backup.service";
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

    const data = await exportPurchaseOrders({
      format: format || "csv",
      includeLineItems: true,
    });

    const filename = `purchase_orders_${new Date().toISOString().split("T")[0]}.${format || "csv"}`;

    return new NextResponse(data, {
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
