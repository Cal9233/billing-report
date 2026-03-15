import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { sendInvoiceEmail } from "@/lib/services/email.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!invoice.customer.email) {
      return NextResponse.json(
        { error: "Customer has no email address" },
        { status: 400 }
      );
    }

    const sent = await sendInvoiceEmail(
      invoice.customer.email,
      invoice.invoiceNumber,
      invoice.customer.name,
      invoice.total,
      invoice.dueDate
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Invoice email sent to ${invoice.customer.email}`,
      success: true,
    });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
