import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { generatePOPDF } from "@/lib/pdf/generate-po-pdf";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: { customer: true, lineItems: true },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Fetch org info for the PDF header
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const doc = generatePOPDF(po, org || undefined);
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${po.poNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PO PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
