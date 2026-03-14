import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { customerCreateSchema } from "@/types";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { invoices: true, purchaseOrders: true },
        },
      },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = customerCreateSchema.parse(body);
    const customer = await prisma.customer.create({ data: validated });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    console.error("Failed to create customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
