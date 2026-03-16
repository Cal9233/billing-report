/**
 * Tests for critical API fixes C1-C4:
 * C1: Invoice/PO number collision retry (P2002)
 * C2: DELETE returns 404 instead of 500 for missing records (P2025)
 * C3: PUT returns 404 instead of 500 for missing records (P2025)
 * C4: Invalid date validation returns 400
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// C2 + C3: DELETE/PUT 404 handling for invoices and purchase orders
// ---------------------------------------------------------------------------

const {
  mockInvoiceDelete,
  mockInvoiceUpdateDirect,
  mockPODelete,
  mockPOUpdateDirect,
  mockTransaction,
  mockDeleteMany,
  mockInvoiceUpdate,
  mockPOLineItemDeleteMany,
  mockPOUpdate,
  mockInvoiceCreate,
  mockPOCreate,
} = vi.hoisted(() => ({
  mockInvoiceDelete: vi.fn().mockResolvedValue({ id: "inv-1" }),
  mockInvoiceUpdateDirect: vi.fn().mockResolvedValue({ id: "inv-1", status: "sent" }),
  mockPODelete: vi.fn().mockResolvedValue({ id: "po-1" }),
  mockPOUpdateDirect: vi.fn().mockResolvedValue({ id: "po-1", status: "approved" }),
  mockTransaction: vi.fn(),
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockInvoiceUpdate: vi.fn().mockResolvedValue({ id: "inv-1" }),
  mockPOLineItemDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockPOUpdate: vi.fn().mockResolvedValue({ id: "po-1" }),
  mockInvoiceCreate: vi.fn().mockResolvedValue({ id: "inv-new" }),
  mockPOCreate: vi.fn().mockResolvedValue({ id: "po-new" }),
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
      delete: (...args: unknown[]) => mockInvoiceDelete(...args),
      create: (...args: unknown[]) => mockInvoiceCreate(...args),
    },
    purchaseOrder: {
      findUnique: vi.fn().mockResolvedValue({ id: "po-1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "po-1" }),
      update: (...args: unknown[]) => mockPOUpdateDirect(...args),
      delete: (...args: unknown[]) => mockPODelete(...args),
      create: (...args: unknown[]) => mockPOCreate(...args),
    },
    customer: {
      findUnique: vi.fn().mockResolvedValue({ id: "cust-1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "cust-1" }),
    },
    lineItem: {
      deleteMany: mockDeleteMany,
    },
    pOLineItem: {
      deleteMany: mockPOLineItemDeleteMany,
    },
  },
}));

import { PUT as invoicePUT, DELETE as invoiceDELETE } from "@/app/api/invoices/[id]/route";
import { PUT as purchaseOrderPUT, DELETE as purchaseOrderDELETE } from "@/app/api/purchase-orders/[id]/route";
import { POST as invoicePOST } from "@/app/api/invoices/route";
import { POST as purchaseOrderPOST } from "@/app/api/purchase-orders/route";

function makeRequest(body: unknown, method = "PUT"): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePrismaError(code: string, message = "error"): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// C2: DELETE returns 404 for missing records
// ---------------------------------------------------------------------------

describe("C2: Invoice DELETE - 404 for missing record", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when deleting a non-existent invoice (P2025)", async () => {
    mockInvoiceDelete.mockRejectedValueOnce(makePrismaError("P2025", "Record not found"));

    const req = makeRequest(null, "DELETE");
    const res = await invoiceDELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("still returns 500 for other database errors on delete", async () => {
    mockInvoiceDelete.mockRejectedValueOnce(new Error("connection refused"));

    const req = makeRequest(null, "DELETE");
    const res = await invoiceDELETE(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(500);
  });

  it("returns 200 on successful delete", async () => {
    mockInvoiceDelete.mockResolvedValueOnce({ id: "inv-1" });

    const req = makeRequest(null, "DELETE");
    const res = await invoiceDELETE(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("C2: Purchase Order DELETE - 404 for missing record", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when deleting a non-existent PO (P2025)", async () => {
    mockPODelete.mockRejectedValueOnce(makePrismaError("P2025", "Record not found"));

    const req = makeRequest(null, "DELETE");
    const res = await purchaseOrderDELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("still returns 500 for other database errors on delete", async () => {
    mockPODelete.mockRejectedValueOnce(new Error("connection refused"));

    const req = makeRequest(null, "DELETE");
    const res = await purchaseOrderDELETE(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// C3: PUT returns 404 for missing records
// ---------------------------------------------------------------------------

describe("C3: Invoice PUT - 404 for missing record", () => {
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

  it("returns 404 when updating a non-existent invoice (direct path, P2025)", async () => {
    mockInvoiceUpdateDirect.mockRejectedValueOnce(makePrismaError("P2025"));

    const req = makeRequest({ status: "sent" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 404 when updating a non-existent invoice (transaction path, P2025)", async () => {
    mockTransaction.mockRejectedValueOnce(makePrismaError("P2025"));

    const req = makeRequest({
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
      taxRate: 0,
    });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });
});

describe("C3: Purchase Order PUT - 404 for missing record", () => {
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

  it("returns 404 when updating a non-existent PO (direct path, P2025)", async () => {
    mockPOUpdateDirect.mockRejectedValueOnce(makePrismaError("P2025"));

    const req = makeRequest({ status: "approved" });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 404 when updating a non-existent PO (transaction path, P2025)", async () => {
    mockTransaction.mockRejectedValueOnce(makePrismaError("P2025"));

    const req = makeRequest({
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
      taxRate: 0,
    });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });
});

// ---------------------------------------------------------------------------
// C4: Invalid date validation returns 400
// ---------------------------------------------------------------------------

describe("C4: Invoice PUT - invalid date validation", () => {
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

  it("returns 400 for invalid issueDate (empty string fails Zod min(1))", async () => {
    const req = makeRequest({ issueDate: "" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    // Empty string fails Zod min(1) validation on the partial schema
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid issueDate (garbage string)", async () => {
    const req = makeRequest({ issueDate: "not-a-date" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("issueDate");
  });

  it("returns 400 for invalid dueDate (garbage string)", async () => {
    const req = makeRequest({ dueDate: "xyz" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("dueDate");
  });

  it("accepts valid ISO date strings", async () => {
    const req = makeRequest({ issueDate: "2026-01-15", dueDate: "2026-02-15" });
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(200);
  });
});

describe("C4: Purchase Order PUT - invalid date validation", () => {
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

  it("returns 400 for invalid issueDate (garbage string)", async () => {
    const req = makeRequest({ issueDate: "not-a-date" });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("issueDate");
  });

  it("returns 400 for invalid dueDate (garbage string)", async () => {
    const req = makeRequest({ dueDate: "garbage" });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("dueDate");
  });

  it("rejects null dueDate (Zod requires string or undefined, not null)", async () => {
    const req = makeRequest({ dueDate: null });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    // null fails Zod string validation - clients should omit the field or send ""
    expect(res.status).toBe(400);
  });

  it("accepts valid date strings", async () => {
    const req = makeRequest({ issueDate: "2026-03-01", dueDate: "2026-04-01" });
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// C1: POST retry on P2002 (unique constraint violation)
// ---------------------------------------------------------------------------

describe("C1: Invoice POST - retry on number collision (P2002)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries and succeeds on second attempt after P2002", async () => {
    mockInvoiceCreate
      .mockRejectedValueOnce(makePrismaError("P2002", "Unique constraint failed"))
      .mockResolvedValueOnce({ id: "inv-new", invoiceNumber: "INV-202603-123456" });

    const req = makeRequest({
      status: "draft",
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      customerId: "cust-1",
      taxRate: 10,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(201);
    expect(mockInvoiceCreate).toHaveBeenCalledTimes(2);
  });

  it("returns 500 after 3 consecutive P2002 collisions", async () => {
    const p2002 = makePrismaError("P2002", "Unique constraint failed");
    mockInvoiceCreate
      .mockRejectedValueOnce(p2002)
      .mockRejectedValueOnce(p2002)
      .mockRejectedValueOnce(p2002);

    const req = makeRequest({
      status: "draft",
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      customerId: "cust-1",
      taxRate: 10,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("unique invoice number");
    expect(mockInvoiceCreate).toHaveBeenCalledTimes(3);
  });

  it("does not retry on non-P2002 errors", async () => {
    mockInvoiceCreate.mockRejectedValueOnce(new Error("connection lost"));

    const req = makeRequest({
      status: "draft",
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      customerId: "cust-1",
      taxRate: 10,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(500);
    expect(mockInvoiceCreate).toHaveBeenCalledTimes(1);
  });
});

describe("C1: Purchase Order POST - retry on number collision (P2002)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries and succeeds on second attempt after P2002", async () => {
    mockPOCreate
      .mockRejectedValueOnce(makePrismaError("P2002", "Unique constraint failed"))
      .mockResolvedValueOnce({ id: "po-new", poNumber: "PO-202603-654321" });

    const req = makeRequest({
      status: "draft",
      issueDate: "2026-03-01",
      customerId: "cust-1",
      taxRate: 5,
      lineItems: [{ description: "Part", quantity: 10, unitPrice: 50 }],
    }, "POST");

    const res = await purchaseOrderPOST(req);
    expect(res.status).toBe(201);
    expect(mockPOCreate).toHaveBeenCalledTimes(2);
  });

  it("returns 500 after 3 consecutive P2002 collisions", async () => {
    const p2002 = makePrismaError("P2002", "Unique constraint failed");
    mockPOCreate
      .mockRejectedValueOnce(p2002)
      .mockRejectedValueOnce(p2002)
      .mockRejectedValueOnce(p2002);

    const req = makeRequest({
      status: "draft",
      issueDate: "2026-03-01",
      customerId: "cust-1",
      taxRate: 5,
      lineItems: [{ description: "Part", quantity: 10, unitPrice: 50 }],
    }, "POST");

    const res = await purchaseOrderPOST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("unique PO number");
    expect(mockPOCreate).toHaveBeenCalledTimes(3);
  });
});
