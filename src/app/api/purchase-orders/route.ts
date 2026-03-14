import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { purchaseOrderCreateSchema } from "@/types";
import {
  generatePONumber,
  calculateLineItemAmount,
  calculateTotals,
} from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = purchaseOrderCreateSchema.parse(body);

    const { subtotal, taxAmount, total } = calculateTotals(
      validated.lineItems,
      validated.taxRate
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePONumber(),
        status: validated.status,
        issueDate: new Date(validated.issueDate),
        expectedDate: validated.expectedDate
          ? new Date(validated.expectedDate)
          : null,
        subtotal,
        taxRate: validated.taxRate,
        taxAmount,
        total,
        notes: validated.notes || null,
        terms: validated.terms || null,
        customerId: validated.customerId,
        lineItems: {
          create: validated.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: calculateLineItemAmount(item.quantity, item.unitPrice),
          })),
        },
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
