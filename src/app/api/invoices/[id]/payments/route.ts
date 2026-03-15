import { NextRequest, NextResponse } from "next/server";
import {
  createPayment,
  getPaymentSummary,
  deletePayment,
} from "@/lib/services/payment.service";
import { paymentCreateSchema } from "@/types";
import { protectAPI } from "@/lib/middleware/api-protection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const summary = await getPaymentSummary(id);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Get payment error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = paymentCreateSchema.parse(body);

    const payment = await createPayment(id, validated);
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create payment error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = await protectAPI(request);
  if (error) {
    return error;
  }

  try {
    const paymentId = request.nextUrl.searchParams.get("paymentId");
    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required" },
        { status: 400 }
      );
    }

    await deletePayment(paymentId);
    return NextResponse.json({ message: "Payment deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete payment error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
