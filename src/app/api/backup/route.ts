import { NextRequest, NextResponse } from "next/server";
import { createFullBackup, restoreFromBackup } from "@/lib/services/backup.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const backup = await createFullBackup(organizationId);
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
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const body = await request.text();
    const restoreResult = await restoreFromBackup(body, organizationId);

    if (!restoreResult.success) {
      return NextResponse.json(restoreResult, { status: 400 });
    }

    return NextResponse.json(restoreResult);
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Restore failed", message: String(error) },
      { status: 500 }
    );
  }
}
