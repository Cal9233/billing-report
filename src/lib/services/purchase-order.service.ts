import prisma from "@/lib/db/client";
import { generatePONumber, calculateLineItemAmount, calculateTotals } from "@/lib/utils";
import type { purchaseOrderCreateSchema, purchaseOrderUpdateSchema } from "@/types";
import type { z } from "zod";

export type POCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type POUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listPurchaseOrders(
  filters?: { status?: string; customerId?: string },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<any>> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.customerId) where.customerId = filters.customerId;

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: purchaseOrders,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages: Math.ceil(total / validLimit),
    },
  };
}

export async function getPurchaseOrderById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function createPurchaseOrder(data: POCreateInput) {
  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new Error("Customer not found");
  }

  const { subtotal, taxAmount, total } = calculateTotals(
    data.lineItems,
    data.taxRate
  );

  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: generatePONumber(),
          status: data.status,
          issueDate: new Date(data.issueDate),
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal,
          taxRate: data.taxRate,
          taxAmount,
          total,
          notes: data.notes || null,
          terms: data.terms || null,
          customerId: data.customerId,
          lineItems: {
            create: data.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: calculateLineItemAmount(item.quantity, item.unitPrice),
            })),
          },
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      return po;
    } catch (err) {
      // Prisma P2002 = unique constraint violation — retry with new number
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  // All retries exhausted
  throw new Error("Failed to generate unique PO number after retries");
}

export async function updatePurchaseOrder(id: string, data: Partial<POUpdateInput>) {
  const updateData: Record<string, unknown> = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.issueDate !== undefined) {
    if (data.issueDate) {
      const d = new Date(data.issueDate);
      if (isNaN(d.getTime())) {
        throw new Error("Invalid issueDate");
      }
      updateData.issueDate = d;
    }
  }
  if (data.expectedDate !== undefined) {
    if (data.expectedDate) {
      const d = new Date(data.expectedDate);
      if (isNaN(d.getTime())) {
        throw new Error("Invalid expectedDate");
      }
      updateData.expectedDate = d;
    }
  }
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.terms !== undefined) updateData.terms = data.terms;
  if (data.customerId !== undefined) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new Error("Customer not found");
    }
    updateData.customerId = data.customerId;
  }
  if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;

  // Handle line items update
  if (data.lineItems !== undefined) {
    const lineItems = data.lineItems;
    const { subtotal, taxAmount, total } = calculateTotals(
      lineItems,
      data.taxRate ?? 0
    );
    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.total = total;

    // Delete old line items and create new ones in a transaction
    return prisma.$transaction(async (tx) => {
      await tx.pOLineItem.deleteMany({ where: { purchaseOrderId: id } });

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...updateData,
          lineItems: {
            create: lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: calculateLineItemAmount(item.quantity, item.unitPrice),
            })),
          },
        },
        include: { customer: true, lineItems: true },
      });
    });
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function deletePurchaseOrder(id: string) {
  return prisma.purchaseOrder.delete({
    where: { id },
  });
}
