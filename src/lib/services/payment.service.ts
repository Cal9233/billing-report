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

  // C-4: Always anchor organizationId at top level — never remove it during search
  const where: Record<string, unknown> = {
    organizationId,
  };

  if (filters.method) {
    where.method = filters.method;
  }

  if (filters.search) {
    const term = filters.search;
    // Use AND to layer search on top of the org scope instead of replacing it
    where.AND = [
      {
        OR: [
          { invoice: { invoiceNumber: { contains: term } } },
          { invoice: { customer: { companyName: { contains: term } } } },
        ],
      },
    ];
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
  return prisma.$transaction(async (tx) => {
    // Validate invoice exists, belongs to org, and is not cancelled
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "cancelled") {
      throw new Error("Cannot add payment to cancelled invoice");
    }

    // Create payment with organizationId
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        organizationId,
        amount: data.amount,
        date: new Date(data.date),
        method: data.method,
        notes: data.notes,
      },
    });

    // Compute totalPaid with SQL aggregate inside the transaction
    const result = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    const totalPaid = result._sum.amount ?? 0;

    // Update invoice status based on payment
    let newStatus = invoice.status;
    if (totalPaid >= invoice.total && invoice.status !== "cancelled") {
      newStatus = "paid";
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    return payment;
  });
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

  // C-4: Include organizationId in payment query for defense-in-depth
  return prisma.payment.findMany({
    where: { invoiceId, organizationId },
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

  // C-4: Include organizationId in payment query for defense-in-depth
  const payments = await prisma.payment.findMany({
    where: { invoiceId, organizationId },
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

/**
 * Derive the correct invoice status after a payment is removed.
 * - "draft" / "cancelled" statuses are never changed by payment operations.
 * - If remaining balance > 0 and dueDate has passed → "overdue"
 * - If remaining balance > 0 (not overdue) → "sent"
 * - If remaining balance <= 0 → "paid"
 */
function deriveInvoiceStatusAfterRemoval(
  currentStatus: string,
  totalPaid: number,
  invoiceTotal: number,
  dueDate: Date
): string {
  // Never touch draft or cancelled invoices
  if (currentStatus === "draft" || currentStatus === "cancelled") {
    return currentStatus;
  }

  if (totalPaid >= invoiceTotal) {
    return "paid";
  }

  // There is a remaining balance
  const now = new Date();
  if (dueDate < now) {
    return "overdue";
  }

  return "sent";
}

export async function deletePayment(
  paymentId: string,
  organizationId: string
): Promise<void> {
  // Use direct organizationId check on payment (M-3 tenancy)
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
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

    const newStatus = deriveInvoiceStatusAfterRemoval(
      invoice.status,
      totalPaid,
      invoice.total,
      invoice.dueDate
    );

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    }
  }
}

export async function updatePayment(
  paymentId: string,
  organizationId: string,
  data: Partial<PaymentCreateInput>
): Promise<any> {
  // Use direct organizationId check on payment (M-3 tenancy)
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
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
