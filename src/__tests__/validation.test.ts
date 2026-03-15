import { describe, it, expect } from "vitest";
import {
  invoiceCreateSchema,
  purchaseOrderCreateSchema,
  customerCreateSchema,
  lineItemSchema,
} from "@/types";

describe("lineItemSchema", () => {
  it("validates valid line item", () => {
    const result = lineItemSchema.safeParse({
      description: "Web Development",
      quantity: 10,
      unitPrice: 150,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = lineItemSchema.safeParse({
      description: "",
      quantity: 1,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = lineItemSchema.safeParse({
      description: "Item",
      quantity: 0,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = lineItemSchema.safeParse({
      description: "Item",
      quantity: -1,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative unit price", () => {
    const result = lineItemSchema.safeParse({
      description: "Item",
      quantity: 1,
      unitPrice: -50,
    });
    expect(result.success).toBe(false);
  });
});

describe("invoiceCreateSchema", () => {
  const validInvoice = {
    customerId: "cust_123",
    issueDate: "2026-03-14",
    dueDate: "2026-04-13",
    taxRate: 8.5,
    status: "draft" as const,
    lineItems: [
      { description: "Service", quantity: 1, unitPrice: 100 },
    ],
  };

  it("validates valid invoice", () => {
    const result = invoiceCreateSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it("rejects missing customerId", () => {
    const result = invoiceCreateSchema.safeParse({
      ...validInvoice,
      customerId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty line items", () => {
    const result = invoiceCreateSchema.safeParse({
      ...validInvoice,
      lineItems: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = invoiceCreateSchema.safeParse({
      ...validInvoice,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional notes and terms", () => {
    const result = invoiceCreateSchema.safeParse({
      ...validInvoice,
      notes: "Test note",
      terms: "Net 30",
    });
    expect(result.success).toBe(true);
  });

  it("defaults taxRate to 0", () => {
    const { taxRate, ...withoutTax } = validInvoice;
    const result = invoiceCreateSchema.safeParse(withoutTax);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxRate).toBe(0);
    }
  });

  it("rejects tax rate over 100", () => {
    const result = invoiceCreateSchema.safeParse({
      ...validInvoice,
      taxRate: 150,
    });
    expect(result.success).toBe(false);
  });
});

describe("purchaseOrderCreateSchema", () => {
  const validPO = {
    customerId: "vendor_123",
    issueDate: "2026-03-14",
    taxRate: 0,
    status: "draft" as const,
    lineItems: [
      { description: "Hardware", quantity: 5, unitPrice: 200 },
    ],
  };

  it("validates valid PO", () => {
    const result = purchaseOrderCreateSchema.safeParse(validPO);
    expect(result.success).toBe(true);
  });

  it("allows optional dueDate", () => {
    const result = purchaseOrderCreateSchema.safeParse({
      ...validPO,
      dueDate: "2026-04-01",
    });
    expect(result.success).toBe(true);
  });

  it("validates PO-specific statuses", () => {
    for (const status of ["draft", "submitted", "approved", "received", "cancelled"]) {
      const result = purchaseOrderCreateSchema.safeParse({ ...validPO, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invoice-specific statuses", () => {
    const result = purchaseOrderCreateSchema.safeParse({
      ...validPO,
      status: "paid",
    });
    expect(result.success).toBe(false);
  });
});

describe("customerCreateSchema", () => {
  it("validates with just name", () => {
    const result = customerCreateSchema.safeParse({ companyName: "Acme Corp" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = customerCreateSchema.safeParse({ companyName: "" });
    expect(result.success).toBe(false);
  });

  it("validates full customer data", () => {
    const result = customerCreateSchema.safeParse({
      companyName: "Acme Corp",
      email: "billing@acme.com",
      phone: "555-0100",
      address: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      country: "US",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = customerCreateSchema.safeParse({
      companyName: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty email string", () => {
    const result = customerCreateSchema.safeParse({
      companyName: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
  });
});
