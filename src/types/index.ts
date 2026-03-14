import { z } from "zod";

// ---- Shared validation schemas ----

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const purchaseOrderCreateSchema = z.object({
  customerId: z.string().min(1, "Vendor is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  expectedDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "received", "cancelled"]).default("draft"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const purchaseOrderUpdateSchema = purchaseOrderCreateSchema.partial();

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("US"),
});

// ---- Type exports ----

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type POStatus = "draft" | "submitted" | "approved" | "received" | "cancelled";
