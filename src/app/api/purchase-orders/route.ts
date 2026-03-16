import { NextRequest, NextResponse } from "next/server";
import { purchaseOrderCreateSchema, ZodError } from "@/types";
import { listPurchaseOrders, createPurchaseOrder } from "@/lib/services/purchase-order.service";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await listPurchaseOrders(organizationId, { status, customerId }, page, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const body = await request.json();
    const validated = purchaseOrderCreateSchema.parse(body);

    const po = await createPurchaseOrder(validated, organizationId);
    return NextResponse.json(po, { status: 201 });
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
    if (error instanceof Error && error.message.includes("Customer not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("Failed to generate unique PO number")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    console.error("Failed to create purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
