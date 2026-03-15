import prisma from "@/lib/db/client";
import { PaymentCreateInput } from "@/types";

export async function createPayment(
  invoiceId: string,
  data: PaymentCreateInput
): Promise<any> {
  // Validate invoice exists and is not cancelled
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "cancelled") {
    throw new Error("Cannot add payment to cancelled invoice");
  }

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: data.amount,
      date: new Date(data.date),
      method: data.method,
      notes: data.notes,
    },
  });

  // Calculate total paid
  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + p.amount,
    0
  ) + data.amount;

  // Update invoice status based on payment
  let newStatus = invoice.status;
  if (totalPaid >= invoice.total && invoice.status !== "cancelled") {
    newStatus = "paid";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });

  return payment;
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<any[]> {
  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { date: "desc" },
  });
}

export async function getPaymentSummary(invoiceId: string): Promise<any> {
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
  });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.total - totalPaid);

  return {
    invoiceTotal: invoice.total,
    totalPaid,
    remaining,
    paymentCount: payments.length,
    lastPaymentDate: payments.length > 0 ? payments[0].date : null,
    payments,
  };
}

export async function deletePayment(
  paymentId: string
): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Delete payment
  await prisma.payment.delete({
    where: { id: paymentId },
  });

  // Recalculate invoice status
  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId },
    include: { payments: true },
  });

  if (invoice) {
    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    let newStatus = invoice.status;
    if (totalPaid < invoice.total && invoice.status === "paid") {
      newStatus = "sent";
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
    });
  }
}

export async function updatePayment(
  paymentId: string,
  data: Partial<PaymentCreateInput>
): Promise<any> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      amount: data.amount ?? payment.amount,
      date: data.date
        ? new Date(data.date)
        : payment.date,
      method: data.method ?? payment.method,
      notes: data.notes ?? payment.notes,
    },
  });

  // Recalculate invoice status
  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId },
    include: { payments: true },
  });

  if (invoice) {
    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    let newStatus = invoice.status;
    if (totalPaid >= invoice.total && invoice.status !== "cancelled") {
      newStatus = "paid";
    } else if (
      totalPaid < invoice.total &&
      invoice.status === "paid"
    ) {
      newStatus = "sent";
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
    });
  }

  return updated;
}
