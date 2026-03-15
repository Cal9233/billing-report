import prisma from "@/lib/db/client";
import { generateInvoiceNumber, calculateLineItemAmount, calculateTotals } from "@/lib/utils";
import type { invoiceCreateSchema, invoiceUpdateSchema, PaginatedResponse } from "@/types";
import type { z } from "zod";

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export async function listInvoices(
  filters?: { status?: string; customerId?: string },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<any>> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));

  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.customerId) where.customerId = filters.customerId;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages: Math.ceil(total / validLimit),
    },
  };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function createInvoice(data: InvoiceCreateInput) {
  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Validate dates
  const issueDateObj = new Date(data.issueDate);
  if (isNaN(issueDateObj.getTime())) {
    throw new Error("Invalid issueDate");
  }
  const dueDateObj = new Date(data.dueDate);
  if (isNaN(dueDateObj.getTime())) {
    throw new Error("Invalid dueDate");
  }

  const { subtotal, taxAmount, total } = calculateTotals(
    data.lineItems,
    data.taxRate
  );

  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          status: data.status,
          issueDate: issueDateObj,
          dueDate: dueDateObj,
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

      return invoice;
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
  throw new Error("Failed to generate unique invoice number after retries");
}

export async function updateInvoice(id: string, data: Partial<InvoiceUpdateInput>) {
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
  if (data.dueDate !== undefined) {
    if (data.dueDate) {
      const d = new Date(data.dueDate);
      if (isNaN(d.getTime())) {
        throw new Error("Invalid dueDate");
      }
      updateData.dueDate = d;
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
      await tx.lineItem.deleteMany({ where: { invoiceId: id } });

      return await tx.invoice.update({
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

  return prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({
    where: { id },
  });
}
