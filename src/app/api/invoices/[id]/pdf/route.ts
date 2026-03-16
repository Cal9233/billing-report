import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";
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
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: { customer: true, lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch org info for the PDF header
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const doc = generateInvoicePDF(invoice, org || undefined);
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
