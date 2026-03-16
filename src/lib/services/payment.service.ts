import prisma from "@/lib/db/client";
import { PaymentCreateInput } from "@/types";

export interface ListPaymentsFilters {
  search?: string;
  method?: string;
}

export interface ListPaymentsResult {
  data: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    method: string;
    date: string;
    notes: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listPayments(
  organizationId: string,
  filters: ListPaymentsFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<ListPaymentsResult> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  const where: Record<string, unknown> = {
    invoice: { organizationId },
  };

  if (filters.method) {
    where.method = filters.method;
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { invoice: { invoiceNumber: { contains: term }, organizationId } },
      { invoice: { customer: { companyName: { contains: term } }, organizationId } },
    ];
    // Remove the top-level invoice filter since OR handles it
    delete where.invoice;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: {
              select: { companyName: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoice.id,
      invoiceNumber: p.invoice.invoiceNumber,
      customerName: p.invoice.customer.companyName,
      amount: p.amount,
      method: p.method,
      date: p.date.toISOString(),
      notes: p.notes,
    })),
    total,
    page: validPage,
    limit: validLimit,
  };
}

export async function createPayment(
  invoiceId: string,
  organizationId: string,
  data: PaymentCreateInput
): Promise<any> {
  // Validate invoice exists, belongs to org, and is not cancelled
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
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

export async function getPaymentsByInvoice(invoiceId: string, organizationId: string): Promise<any[]> {
  // Verify invoice belongs to org
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { date: "desc" },
  });
}

export async function getPaymentSummary(invoiceId: string, organizationId: string): Promise<any> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const payments = await prisma.payment.findMany({
    where: { invoiceId },
  });

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
  paymentId: string,
  organizationId: string
): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { organizationId: true } } },
  });

  if (!payment || payment.invoice.organizationId !== organizationId) {
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
  organizationId: string,
  data: Partial<PaymentCreateInput>
): Promise<any> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { organizationId: true } } },
  });

  if (!payment || payment.invoice.organizationId !== organizationId) {
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
