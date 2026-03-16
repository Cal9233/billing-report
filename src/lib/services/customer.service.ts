import prisma from "@/lib/db/client";
import type { customerCreateSchema, customerUpdateSchema, PaginatedResponse } from "@/types";
import type { z } from "zod";

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function listCustomers(
  organizationId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<any>> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  const where = { organizationId };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { companyName: "asc" },
      include: {
        _count: {
          select: { invoices: true, purchaseOrders: true },
        },
      },
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages: Math.ceil(total / validLimit),
    },
  };
}

export async function getCustomerById(id: string, organizationId: string) {
  return prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      _count: { select: { invoices: true, purchaseOrders: true } },
    },
  });
}

export async function createCustomer(data: CustomerCreateInput, organizationId: string) {
  return prisma.customer.create({
    data: {
      ...data,
      organizationId,
    },
  });
}

export async function updateCustomer(id: string, organizationId: string, data: Partial<CustomerCreateInput>) {
  // Verify customer belongs to org
  const existing = await prisma.customer.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Customer not found");
  }

  return prisma.customer.update({
    where: { id },
    data,
  });
}

export async function deleteCustomer(id: string, organizationId: string) {
  // Verify customer belongs to org
  const existing = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      _count: { select: { invoices: true, purchaseOrders: true } },
    },
  });
  if (!existing) {
    throw new Error("Customer not found");
  }

  const relatedCount = existing._count.invoices + existing._count.purchaseOrders;
  if (relatedCount > 0) {
    throw new Error(
      `Cannot delete customer with existing invoices or purchase orders. This customer has ${existing._count.invoices} invoice(s) and ${existing._count.purchaseOrders} purchase order(s).`
    );
  }

  return prisma.customer.delete({
    where: { id },
  });
}
