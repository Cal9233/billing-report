import prisma from "@/lib/db/client";

export interface SearchResult {
  id: string;
  type: "invoice" | "purchase_order" | "customer";
  title: string;
  subtitle: string;
  href: string;
  amount?: number;
  status?: string;
}

export async function globalSearch(query: string, organizationId: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;
  const results: SearchResult[] = [];

  // Search invoices by number or customer name
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      OR: [
        { invoiceNumber: { contains: searchTerm } },
        { customer: { companyName: { contains: searchTerm } } },
      ],
    },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      customer: { select: { companyName: true } },
    },
    take: 5,
  });

  results.push(
    ...invoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      title: `Invoice ${inv.invoiceNumber}`,
      subtitle: inv.customer.companyName,
      href: `/invoices/${inv.id}`,
      amount: inv.total,
      status: inv.status,
    }))
  );

  // Search purchase orders by number or customer name
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      OR: [
        { poNumber: { contains: searchTerm } },
        { customer: { companyName: { contains: searchTerm } } },
      ],
    },
    select: {
      id: true,
      poNumber: true,
      total: true,
      status: true,
      customer: { select: { companyName: true } },
    },
    take: 5,
  });

  results.push(
    ...purchaseOrders.map((po) => ({
      id: po.id,
      type: "purchase_order" as const,
      title: `PO ${po.poNumber}`,
      subtitle: po.customer.companyName,
      href: `/purchase-orders/${po.id}`,
      amount: po.total,
      status: po.status,
    }))
  );

  // Search customers
  const customers = await prisma.customer.findMany({
    where: {
      organizationId,
      OR: [
        { companyName: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
      ],
    },
    select: {
      id: true,
      companyName: true,
      email: true,
    },
    take: 5,
  });

  results.push(
    ...customers.map((cust) => ({
      id: cust.id,
      type: "customer" as const,
      title: cust.companyName,
      subtitle: cust.email || "No email",
      href: `/customers?customerId=${cust.id}`,
    }))
  );

  return results.slice(0, 15); // Limit total results to 15
}

export async function searchInvoices(
  query: string,
  organizationId: string,
  filters?: {
    status?: string;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> {
  const searchTerm = `%${query.trim()}%`;

  return prisma.invoice.findMany({
    where: {
      organizationId,
      AND: [
        {
          OR: [
            { invoiceNumber: { contains: searchTerm } },
            { customer: { companyName: { contains: searchTerm } } },
            { notes: { contains: searchTerm } },
          ],
        },
        filters?.status ? { status: filters.status } : {},
        filters?.customerId ? { customerId: filters.customerId } : {},
        filters?.startDate ? { issueDate: { gte: filters.startDate } } : {},
        filters?.endDate ? { issueDate: { lte: filters.endDate } } : {},
      ],
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchPurchaseOrders(
  query: string,
  organizationId: string,
  filters?: {
    status?: string;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> {
  const searchTerm = `%${query.trim()}%`;

  return prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      AND: [
        {
          OR: [
            { poNumber: { contains: searchTerm } },
            { customer: { companyName: { contains: searchTerm } } },
            { notes: { contains: searchTerm } },
          ],
        },
        filters?.status ? { status: filters.status } : {},
        filters?.customerId ? { customerId: filters.customerId } : {},
        filters?.startDate ? { issueDate: { gte: filters.startDate } } : {},
        filters?.endDate ? { issueDate: { lte: filters.endDate } } : {},
      ],
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
