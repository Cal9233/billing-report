import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { invoiceCreateSchema } from "@/types";
import {
  generateInvoiceNumber,
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

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = invoiceCreateSchema.parse(body);

    const { subtotal, taxAmount, total } = calculateTotals(
      validated.lineItems,
      validated.taxRate
    );

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        status: validated.status,
        issueDate: new Date(validated.issueDate),
        dueDate: new Date(validated.dueDate),
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

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
