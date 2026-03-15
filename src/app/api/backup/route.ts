import { NextRequest, NextResponse } from "next/server";
import { createFullBackup, restoreFromBackup } from "@/lib/services/backup.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const backup = await createFullBackup();
    const filename = `billflow_backup_${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(backup, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Backup failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const body = await request.text();
    const result = await restoreFromBackup(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Restore failed", message: String(error) },
      { status: 500 }
    );
  }
}
