import { NextRequest, NextResponse } from "next/server";
import { purchaseOrderUpdateSchema, ZodError } from "@/types";
import { getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder } from "@/lib/services/purchase-order.service";
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
    const po = await getPurchaseOrderById(id, organizationId);

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
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = purchaseOrderUpdateSchema.parse(body);

    const po = await updatePurchaseOrder(id, organizationId, validated);
    return NextResponse.json(po);
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
    if (error instanceof Error && error.message === "Purchase order not found") {
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
    console.error("Failed to update purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
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
    await deletePurchaseOrder(id, organizationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Purchase order not found") {
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
    console.error("Failed to delete purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
