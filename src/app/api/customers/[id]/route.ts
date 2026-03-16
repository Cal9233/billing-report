import { NextRequest, NextResponse } from "next/server";
import { customerUpdateSchema, ZodError } from "@/types";
import { getCustomerById, updateCustomer, deleteCustomer } from "@/lib/services/customer.service";
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
    const customer = await getCustomerById(id, organizationId);

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
  const result = await protectAPI(request);
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

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

    const customer = await updateCustomer(id, organizationId, validated);
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
    if (error instanceof Error && error.message === "Customer not found") {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await protectAPI(request, { roles: ["admin"] });
  if (result.error) return result.error;
  const { organizationId } = result.session.user;

  try {
    const { id } = await params;
    await deleteCustomer(id, organizationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Customer not found") {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message.includes("Cannot delete customer")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
