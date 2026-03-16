/**
 * Additional tests covering:
 * - HTTP response status codes from PUT handlers
 * - Transaction rollback guard (deleteMany throws => update not called)
 * - Non-transaction PUT path (no lineItems) response body and status
 * - 400 response on Zod validation failure
 * - 500 response when $transaction rejects
 * - invoiceUpdateSchema / purchaseOrderUpdateSchema partial semantics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockDeleteMany,
  mockInvoiceUpdate,
  mockInvoiceUpdateDirect,
  mockPOLineItemDeleteMany,
  mockPOUpdate,
  mockPOUpdateDirect,
  mockTransaction,
} = vi.hoisted(() => ({
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockInvoiceUpdate: vi.fn().mockResolvedValue({ id: "inv-1" }),
  mockInvoiceUpdateDirect: vi.fn().mockResolvedValue({ id: "inv-1", status: "sent" }),
  mockPOLineItemDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockPOUpdate: vi.fn().mockResolvedValue({ id: "po-1" }),
  mockPOUpdateDirect: vi.fn().mockResolvedValue({ id: "po-1", status: "approved" }),
  mockTransaction: vi.fn(),
}));

// Mock auth middleware so route handlers don't call headers() outside Next.js context
vi.mock("@/lib/middleware/api-protection", () => ({
  protectAPI: vi.fn().mockResolvedValue({
    error: null,
    session: {
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
        organizationId: "org-1",
        organizationName: "Test Org",
        organizationSlug: "test-org",
      },
    },
  }),
  protectAPILegacy: vi.fn().mockResolvedValue(null),
  protectPublicAPI: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/client", () => ({
  default: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    invoice: {
      findUnique: vi.fn().mockResolvedValue({ id: "inv-1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "inv-1" }),
      update: (...args: unknown[]) => mockInvoiceUpdateDirect(...args),
      delete: vi.fn().mockResolvedValue({ id: "inv-1" }),
    },
    purchaseOrder: {
      findUnique: vi.fn().mockResolvedValue({ id: "po-1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "po-1" }),
      update: (...args: unknown[]) => mockPOUpdateDirect(...args),
      delete: vi.fn().mockResolvedValue({ id: "po-1" }),
    },
    lineItem: {
      deleteMany: mockDeleteMany,
    },
    pOLineItem: {
      deleteMany: mockPOLineItemDeleteMany,
    },
  },
}));

import { PUT as invoicePUT } from "@/app/api/invoices/[id]/route";
import { PUT as purchaseOrderPUT } from "@/app/api/purchase-orders/[id]/route";
import { invoiceUpdateSchema, purchaseOrderUpdateSchema } from "@/types";

function makeRequest(body: unknown, method = "PUT"): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validLineItems = [
  { description: "Consulting", quantity: 3, unitPrice: 200 },
];

// ---------------------------------------------------------------------------
// Invoice PUT — response status codes
// ---------------------------------------------------------------------------

describe("Invoice PUT - response status codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        lineItem: { deleteMany: mockDeleteMany },
        invoice: { update: mockInvoiceUpdate },
      };
      return cb(txClient);
    });
  });

  it("returns 200 when updating with line items (transaction path)", async () => {
    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 200 when updating without line items (direct path)", async () => {
    const req = makeRequest({ status: "sent" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 400 when body fails Zod validation", async () => {
    // taxRate > 100 fails the schema
    const req = makeRequest({ taxRate: 999 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 response body with error key", async () => {
    const req = makeRequest({ taxRate: -1 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when $transaction throws", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("DB connection lost"));
    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(500);
  });

  it("returns 500 response body with error key when transaction fails", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("deadlock"));
    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// Invoice PUT — transaction rollback guard
// ---------------------------------------------------------------------------

describe("Invoice PUT - transaction rollback guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call invoice.update when deleteMany throws inside transaction", async () => {
    // Simulate deleteMany failing — the tx callback will throw and $transaction
    // propagates the error, meaning update must never be reached.
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        lineItem: {
          deleteMany: vi.fn().mockRejectedValue(new Error("constraint violation")),
        },
        invoice: { update: mockInvoiceUpdate },
      };
      // The callback will throw when deleteMany rejects; propagate it
      return cb(txClient);
    });

    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockInvoiceUpdate).not.toHaveBeenCalled();
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Invoice PUT — non-transaction path (no lineItems) calls direct update
// ---------------------------------------------------------------------------

describe("Invoice PUT - non-transaction direct update path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        lineItem: { deleteMany: mockDeleteMany },
        invoice: { update: mockInvoiceUpdate },
      };
      return cb(txClient);
    });
  });

  it("calls prisma.invoice.update directly (not via transaction) when no lineItems", async () => {
    const req = makeRequest({ status: "sent" });
    await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockInvoiceUpdateDirect).toHaveBeenCalledTimes(1);
  });

  it("passes correct where clause to direct update", async () => {
    const req = makeRequest({ status: "paid" });
    await invoicePUT(req, { params: Promise.resolve({ id: "inv-42" }) });

    expect(mockInvoiceUpdateDirect).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-42" } })
    );
  });
});

// ---------------------------------------------------------------------------
// Purchase Order PUT — response status codes
// ---------------------------------------------------------------------------

describe("Purchase Order PUT - response status codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        pOLineItem: { deleteMany: mockPOLineItemDeleteMany },
        purchaseOrder: { update: mockPOUpdate },
      };
      return cb(txClient);
    });
  });

  it("returns 200 when updating with line items (transaction path)", async () => {
    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 200 when updating without line items (direct path)", async () => {
    const req = makeRequest({ status: "approved" });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 400 when body fails Zod validation", async () => {
    const req = makeRequest({ taxRate: 200 });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 500 when $transaction throws", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("timeout"));
    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Purchase Order PUT — transaction rollback guard
// ---------------------------------------------------------------------------

describe("Purchase Order PUT - transaction rollback guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call purchaseOrder.update when pOLineItem.deleteMany throws", async () => {
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        pOLineItem: {
          deleteMany: vi.fn().mockRejectedValue(new Error("lock timeout")),
        },
        purchaseOrder: { update: mockPOUpdate },
      };
      return cb(txClient);
    });

    const req = makeRequest({ lineItems: validLineItems, taxRate: 0 });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(mockPOUpdate).not.toHaveBeenCalled();
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Purchase Order PUT — non-transaction path
// ---------------------------------------------------------------------------

describe("Purchase Order PUT - non-transaction direct update path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        pOLineItem: { deleteMany: mockPOLineItemDeleteMany },
        purchaseOrder: { update: mockPOUpdate },
      };
      return cb(txClient);
    });
  });

  it("calls prisma.purchaseOrder.update directly when no lineItems", async () => {
    const req = makeRequest({ status: "received" });
    await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockPOUpdateDirect).toHaveBeenCalledTimes(1);
  });

  it("passes correct where clause to direct PO update", async () => {
    const req = makeRequest({ status: "approved" });
    await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-99" }) });

    expect(mockPOUpdateDirect).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "po-99" } })
    );
  });
});

// ---------------------------------------------------------------------------
// invoiceUpdateSchema — partial semantics
// ---------------------------------------------------------------------------

describe("invoiceUpdateSchema - partial semantics", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = invoiceUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    const result = invoiceUpdateSchema.safeParse({ status: "paid" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only taxRate", () => {
    const result = invoiceUpdateSchema.safeParse({ taxRate: 15 });
    expect(result.success).toBe(true);
  });

  it("still rejects invalid taxRate (> 100) even when partial", () => {
    const result = invoiceUpdateSchema.safeParse({ taxRate: 101 });
    expect(result.success).toBe(false);
  });

  it("still rejects invalid status even when partial", () => {
    const result = invoiceUpdateSchema.safeParse({ status: "pending" });
    expect(result.success).toBe(false);
  });

  it("still rejects empty lineItems array when lineItems is provided", () => {
    // lineItemSchema min(1) is preserved in partial — providing the key with
    // an empty array must fail
    const result = invoiceUpdateSchema.safeParse({ lineItems: [] });
    expect(result.success).toBe(false);
  });

  it("accepts valid lineItems when provided", () => {
    const result = invoiceUpdateSchema.safeParse({
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 50 }],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// purchaseOrderUpdateSchema — partial semantics
// ---------------------------------------------------------------------------

describe("purchaseOrderUpdateSchema - partial semantics", () => {
  it("accepts empty object", () => {
    const result = purchaseOrderUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    const result = purchaseOrderUpdateSchema.safeParse({ status: "received" });
    expect(result.success).toBe(true);
  });

  it("still rejects invalid status even when partial", () => {
    // 'paid' is an invoice status, not valid for PO
    const result = purchaseOrderUpdateSchema.safeParse({ status: "paid" });
    expect(result.success).toBe(false);
  });

  it("still rejects invalid taxRate even when partial", () => {
    const result = purchaseOrderUpdateSchema.safeParse({ taxRate: -5 });
    expect(result.success).toBe(false);
  });

  it("still rejects empty lineItems array when lineItems is provided", () => {
    const result = purchaseOrderUpdateSchema.safeParse({ lineItems: [] });
    expect(result.success).toBe(false);
  });
});
