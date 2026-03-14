import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { invoiceUpdateSchema } from "@/types";
import { calculateLineItemAmount, calculateTotals } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = invoiceUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validated.status) updateData.status = validated.status;
    if (validated.issueDate) updateData.issueDate = new Date(validated.issueDate);
    if (validated.dueDate) updateData.dueDate = new Date(validated.dueDate);
    if (validated.notes !== undefined) updateData.notes = validated.notes || null;
    if (validated.terms !== undefined) updateData.terms = validated.terms || null;
    if (validated.customerId) updateData.customerId = validated.customerId;
    if (validated.taxRate !== undefined) updateData.taxRate = validated.taxRate;

    if (validated.lineItems) {
      const { subtotal, taxAmount, total } = calculateTotals(
        validated.lineItems,
        validated.taxRate ?? 0
      );
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.total = total;

      // Delete old line items and create new ones
      await prisma.lineItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          ...updateData,
          lineItems: {
            create: validated.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: calculateLineItemAmount(item.quantity, item.unitPrice),
            })),
          },
        },
        include: { customer: true, lineItems: true },
      });

      return NextResponse.json(invoice);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { customer: true, lineItems: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
