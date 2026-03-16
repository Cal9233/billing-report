import { NextRequest, NextResponse } from "next/server";
import { invoiceUpdateSchema, ZodError } from "@/types";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/lib/services/invoice.service";
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
    const invoice = await getInvoiceById(id, organizationId);

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
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = invoiceUpdateSchema.parse(body);

    const invoice = await updateInvoice(id, organizationId, validated);
    return NextResponse.json(invoice);
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
    if (error instanceof Error && error.message === "Invoice not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Prisma P2025 = Record not found
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Prisma P2003 = Foreign key constraint failure (e.g., invalid customerId)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Referenced record not found (e.g., invalid customerId)" },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("Customer not found")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("No fields to update")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { id } = await params;
    await deleteInvoice(id, organizationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Invoice not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Prisma P2025 = Record not found
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
