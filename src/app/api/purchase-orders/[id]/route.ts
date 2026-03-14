import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { purchaseOrderUpdateSchema } from "@/types";
import { calculateLineItemAmount, calculateTotals } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Failed to fetch purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
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
    const validated = purchaseOrderUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validated.status) updateData.status = validated.status;
    if (validated.issueDate)
      updateData.issueDate = new Date(validated.issueDate);
    if (validated.expectedDate !== undefined)
      updateData.expectedDate = validated.expectedDate
        ? new Date(validated.expectedDate)
        : null;
    if (validated.notes !== undefined)
      updateData.notes = validated.notes || null;
    if (validated.terms !== undefined)
      updateData.terms = validated.terms || null;
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

      await prisma.pOLineItem.deleteMany({ where: { purchaseOrderId: id } });

      const po = await prisma.purchaseOrder.update({
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

      return NextResponse.json(po);
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { customer: true, lineItems: true },
    });

    return NextResponse.json(po);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
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
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
