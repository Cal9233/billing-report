import prisma from "@/lib/db/client";

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  dueDate: Date;
  daysOverdue: number;
  status: string;
}

export interface OverdueSummary {
  totalOverdueInvoices: number;
  totalOverdueAmount: number;
  overdueBuckets: {
    lessThan30Days: { count: number; amount: number };
    thirtyTo60Days: { count: number; amount: number };
    sixtyTo90Days: { count: number; amount: number };
    over90Days: { count: number; amount: number };
  };
  invoices: OverdueInvoice[];
}

export async function getOverdueInvoices(): Promise<OverdueInvoice[]> {
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      status: {
        in: ["sent", "overdue"],
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      dueDate: true,
      status: true,
      customer: {
        select: {
          companyName: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return invoices.map((inv) => {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysOverdue = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / millisecondsPerDay
    );

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.companyName,
      total: inv.total,
      dueDate: inv.dueDate,
      daysOverdue,
      status: inv.status,
    };
  });
}

export async function getOverdueSummary(): Promise<OverdueSummary> {
  const overdueInvoices = await getOverdueInvoices();

  const summary: OverdueSummary = {
    totalOverdueInvoices: overdueInvoices.length,
    totalOverdueAmount: overdueInvoices.reduce(
      (sum, inv) => sum + inv.total,
      0
    ),
    overdueBuckets: {
      lessThan30Days: { count: 0, amount: 0 },
      thirtyTo60Days: { count: 0, amount: 0 },
      sixtyTo90Days: { count: 0, amount: 0 },
      over90Days: { count: 0, amount: 0 },
    },
    invoices: overdueInvoices,
  };

  // Categorize invoices by days overdue
  for (const inv of overdueInvoices) {
    if (inv.daysOverdue < 30) {
      summary.overdueBuckets.lessThan30Days.count++;
      summary.overdueBuckets.lessThan30Days.amount += inv.total;
    } else if (inv.daysOverdue < 60) {
      summary.overdueBuckets.thirtyTo60Days.count++;
      summary.overdueBuckets.thirtyTo60Days.amount += inv.total;
    } else if (inv.daysOverdue < 90) {
      summary.overdueBuckets.sixtyTo90Days.count++;
      summary.overdueBuckets.sixtyTo90Days.amount += inv.total;
    } else {
      summary.overdueBuckets.over90Days.count++;
      summary.overdueBuckets.over90Days.amount += inv.total;
    }
  }

  return summary;
}

export async function markInvoiceAsOverdue(invoiceId: string): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "overdue" },
  });
}

export async function updateOverdueStatuses(): Promise<number> {
  const now = new Date();

  const result = await prisma.invoice.updateMany({
    where: {
      dueDate: {
        lt: now,
      },
      status: "sent",
    },
    data: {
      status: "overdue",
    },
  });

  return result.count;
}
