import prisma from "@/lib/db/client";
import type { customerCreateSchema, customerUpdateSchema, PaginatedResponse } from "@/types";
import type { z } from "zod";

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function listCustomers(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<any>> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { invoices: true, purchaseOrders: true },
        },
      },
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    }),
    prisma.customer.count(),
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

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { invoices: true, purchaseOrders: true } },
    },
  });
}

export async function createCustomer(data: CustomerCreateInput) {
  return prisma.customer.create({
    data,
  });
}

export async function updateCustomer(id: string, data: Partial<CustomerCreateInput>) {
  return prisma.customer.update({
    where: { id },
    data,
  });
}

export async function deleteCustomer(id: string) {
  return prisma.customer.delete({
    where: { id },
  });
}
