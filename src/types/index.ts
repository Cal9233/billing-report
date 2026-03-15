import { z, ZodError } from "zod";

export { ZodError };

// ---- Shared validation schemas ----

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  quantity: z.number().positive("Quantity must be positive").max(1_000_000, "Quantity too large"),
  unitPrice: z.number().min(0, "Unit price must be non-negative").max(1_000_000_000, "Unit price too large"),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required").max(100, "Customer ID too long"),
  issueDate: z.string().min(1, "Issue date is required").max(50, "Issue date too long"),
  dueDate: z.string().min(1, "Due date is required").max(50, "Due date too long"),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().max(5000, "Notes too long").optional(),
  terms: z.string().max(5000, "Terms too long").optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required").max(200, "Too many line items"),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const purchaseOrderCreateSchema = z.object({
  customerId: z.string().min(1, "Vendor is required").max(100, "Customer ID too long"),
  issueDate: z.string().min(1, "Issue date is required").max(50, "Issue date too long"),
  expectedDate: z.string().max(50, "Expected date too long").optional(),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().max(5000, "Notes too long").optional(),
  terms: z.string().max(5000, "Terms too long").optional(),
  status: z.enum(["draft", "submitted", "approved", "received", "cancelled"]).default("draft"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required").max(200, "Too many line items"),
});

export const purchaseOrderUpdateSchema = purchaseOrderCreateSchema.partial();

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  email: z.string().email().max(254, "Email too long").optional().or(z.literal("")),
  phone: z.string().max(30, "Phone too long").optional(),
  address: z.string().max(500, "Address too long").optional(),
  city: z.string().max(100, "City too long").optional(),
  state: z.string().max(100, "State too long").optional(),
  zip: z.string().max(20, "Zip too long").optional(),
  country: z.string().max(100, "Country too long").default("US"),
});

// ---- Type exports ----

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customerUpdateSchema = customerCreateSchema.partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type POStatus = "draft" | "submitted" | "approved" | "received" | "cancelled";

// ---- Shared pagination type ----

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
