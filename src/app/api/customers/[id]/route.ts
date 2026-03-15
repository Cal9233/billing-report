import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { customerUpdateSchema, ZodError } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true, purchaseOrders: true } },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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
    const validated = customerUpdateSchema.parse(body);

    // M6: Reject empty-body PUT (no meaningful fields)
    const meaningfulKeys = Object.keys(validated).filter(
      (k) => validated[k as keyof typeof validated] !== undefined
    );
    if (meaningfulKeys.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: validated,
      include: {
        _count: { select: { invoices: true, purchaseOrders: true } },
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    // Prisma P2025 = Record not found
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
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

    // Check if customer exists first
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true, purchaseOrders: true } },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check for existing invoices/POs (onDelete: Restrict will block this)
    const relatedCount = customer._count.invoices + customer._count.purchaseOrders;
    if (relatedCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with existing invoices or purchase orders",
          details: [
            {
              invoices: customer._count.invoices,
              purchaseOrders: customer._count.purchaseOrders,
              message: `This customer has ${customer._count.invoices} invoice(s) and ${customer._count.purchaseOrders} purchase order(s). Delete or reassign them first.`,
            },
          ],
        },
        { status: 409 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
