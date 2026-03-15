/**
 * Tests for moderate API fixes M1-M6:
 * M1: Customer existence validation on Invoice/PO create
 * M2: Pagination on list endpoints
 * M3: Reports endpoint groups by customerId instead of name
 * M4: Customer PUT and DELETE endpoints
 * M5: ZodError detection uses instanceof instead of error.name
 * M6: Empty-body PUT rejected with 400
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const {
  mockCustomerFindUnique,
  mockCustomerFindMany,
  mockCustomerCount,
  mockCustomerUpdate,
  mockCustomerDelete,
  mockCustomerCreate,
  mockInvoiceFindMany,
  mockInvoiceCount,
  mockInvoiceCreate,
  mockInvoiceUpdateDirect,
  mockPOFindMany,
  mockPOCount,
  mockPOCreate,
  mockPOUpdateDirect,
  mockTransaction,
  mockDeleteMany,
  mockInvoiceUpdate,
  mockPOLineItemDeleteMany,
  mockPOUpdate,
} = vi.hoisted(() => ({
  mockCustomerFindUnique: vi.fn(),
  mockCustomerFindMany: vi.fn().mockResolvedValue([]),
  mockCustomerCount: vi.fn().mockResolvedValue(0),
  mockCustomerUpdate: vi.fn(),
  mockCustomerDelete: vi.fn(),
  mockCustomerCreate: vi.fn(),
  mockInvoiceFindMany: vi.fn().mockResolvedValue([]),
  mockInvoiceCount: vi.fn().mockResolvedValue(0),
  mockInvoiceCreate: vi.fn(),
  mockInvoiceUpdateDirect: vi.fn(),
  mockPOFindMany: vi.fn().mockResolvedValue([]),
  mockPOCount: vi.fn().mockResolvedValue(0),
  mockPOCreate: vi.fn(),
  mockPOUpdateDirect: vi.fn(),
  mockTransaction: vi.fn(),
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockInvoiceUpdate: vi.fn(),
  mockPOLineItemDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockPOUpdate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  default: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    customer: {
      findUnique: (...args: unknown[]) => mockCustomerFindUnique(...args),
      findMany: (...args: unknown[]) => mockCustomerFindMany(...args),
      count: (...args: unknown[]) => mockCustomerCount(...args),
      update: (...args: unknown[]) => mockCustomerUpdate(...args),
      delete: (...args: unknown[]) => mockCustomerDelete(...args),
      create: (...args: unknown[]) => mockCustomerCreate(...args),
    },
    invoice: {
      findUnique: vi.fn().mockResolvedValue({ id: "inv-1" }),
      findMany: (...args: unknown[]) => mockInvoiceFindMany(...args),
      count: (...args: unknown[]) => mockInvoiceCount(...args),
      create: (...args: unknown[]) => mockInvoiceCreate(...args),
      update: (...args: unknown[]) => mockInvoiceUpdateDirect(...args),
    },
    purchaseOrder: {
      findUnique: vi.fn().mockResolvedValue({ id: "po-1" }),
      findMany: (...args: unknown[]) => mockPOFindMany(...args),
      count: (...args: unknown[]) => mockPOCount(...args),
      create: (...args: unknown[]) => mockPOCreate(...args),
      update: (...args: unknown[]) => mockPOUpdateDirect(...args),
    },
    lineItem: {
      deleteMany: mockDeleteMany,
    },
    pOLineItem: {
      deleteMany: mockPOLineItemDeleteMany,
    },
  },
}));

import { POST as invoicePOST, GET as invoiceGET } from "@/app/api/invoices/route";
import { POST as poPOST, GET as poGET } from "@/app/api/purchase-orders/route";
import { GET as customerGET } from "@/app/api/customers/route";
import { PUT as customerPUT, DELETE as customerDELETE } from "@/app/api/customers/[id]/route";
import { PUT as invoicePUT } from "@/app/api/invoices/[id]/route";
import { PUT as purchaseOrderPUT } from "@/app/api/purchase-orders/[id]/route";

function makeRequest(url: string, body?: unknown, method = "GET"): NextRequest {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, opts as any);
}

function makePrismaError(code: string, message = "error"): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// M1: Customer existence validation on Invoice/PO create
// ---------------------------------------------------------------------------

describe("M1: Invoice POST - customer existence validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when customerId does not exist", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce(null);

    const req = makeRequest("http://localhost:3000/api/invoices", {
      customerId: "nonexistent-customer",
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      taxRate: 0,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
  });

  it("proceeds to create when customer exists", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({ id: "cust-1" });
    mockInvoiceCreate.mockResolvedValueOnce({ id: "inv-new", invoiceNumber: "INV-001" });

    const req = makeRequest("http://localhost:3000/api/invoices", {
      customerId: "cust-1",
      issueDate: "2026-03-01",
      dueDate: "2026-04-01",
      taxRate: 0,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(201);
  });
});

describe("M1: Purchase Order POST - customer existence validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when customerId does not exist", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce(null);

    const req = makeRequest("http://localhost:3000/api/purchase-orders", {
      customerId: "nonexistent-vendor",
      issueDate: "2026-03-01",
      taxRate: 0,
      lineItems: [{ description: "Part", quantity: 10, unitPrice: 50 }],
    }, "POST");

    const res = await poPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
  });

  it("proceeds to create when customer exists", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({ id: "cust-1" });
    mockPOCreate.mockResolvedValueOnce({ id: "po-new", poNumber: "PO-001" });

    const req = makeRequest("http://localhost:3000/api/purchase-orders", {
      customerId: "cust-1",
      issueDate: "2026-03-01",
      taxRate: 0,
      lineItems: [{ description: "Part", quantity: 10, unitPrice: 50 }],
    }, "POST");

    const res = await poPOST(req);
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// M2: Pagination on list endpoints
// ---------------------------------------------------------------------------

describe("M2: Invoice GET - pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated response with defaults (page=1, limit=20)", async () => {
    const mockData = [{ id: "inv-1", invoiceNumber: "INV-001" }];
    mockInvoiceFindMany.mockResolvedValueOnce(mockData);
    mockInvoiceCount.mockResolvedValueOnce(1);

    const req = makeRequest("http://localhost:3000/api/invoices");
    const res = await invoiceGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(body.data).toEqual(mockData);
  });

  it("respects custom page and limit params", async () => {
    mockInvoiceFindMany.mockResolvedValueOnce([]);
    mockInvoiceCount.mockResolvedValueOnce(50);

    const req = makeRequest("http://localhost:3000/api/invoices?page=3&limit=10");
    const res = await invoiceGET(req);
    const body = await res.json();

    expect(body.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
  });

  it("clamps limit to max 100", async () => {
    mockInvoiceFindMany.mockResolvedValueOnce([]);
    mockInvoiceCount.mockResolvedValueOnce(0);

    const req = makeRequest("http://localhost:3000/api/invoices?limit=500");
    const res = await invoiceGET(req);
    const body = await res.json();

    expect(body.pagination.limit).toBe(100);
  });
});

describe("M2: Purchase Orders GET - pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated response structure", async () => {
    mockPOFindMany.mockResolvedValueOnce([]);
    mockPOCount.mockResolvedValueOnce(0);

    const req = makeRequest("http://localhost:3000/api/purchase-orders");
    const res = await poGET(req);
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(20);
  });
});

describe("M2: Customers GET - pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated response structure", async () => {
    mockCustomerFindMany.mockResolvedValueOnce([]);
    mockCustomerCount.mockResolvedValueOnce(0);

    const req = makeRequest("http://localhost:3000/api/customers");
    const res = await customerGET(req);
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// M3: Reports group by customerId (tested via the report structure)
// ---------------------------------------------------------------------------

describe("M3: Reports endpoint groups by customerId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns customerRevenue with id field (grouped by id, not name)", async () => {
    // We need to test the reports route separately since it has its own mock pattern
    // The key assertion is that the report code now filters by customer.id === c.id
    // instead of customer.name === c.name
    //
    // We verify this by checking the import works and the structure includes id
    const { GET: reportGET } = await import("@/app/api/reports/route");

    // Mock the Prisma calls that the reports route makes via Promise.all
    const mockInvoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        status: "paid",
        total: 1000,
        issueDate: new Date("2026-01-15"),
        customer: { id: "cust-1", name: "Acme Corp" },
        lineItems: [],
        createdAt: new Date(),
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        status: "sent",
        total: 500,
        issueDate: new Date("2026-02-15"),
        customer: { id: "cust-2", name: "Acme Corp" },  // Same name, different ID
        lineItems: [],
        createdAt: new Date(),
      },
    ];

    const mockCustomers = [
      { id: "cust-1", name: "Acme Corp", _count: { invoices: 1, purchaseOrders: 0 } },
      { id: "cust-2", name: "Acme Corp", _count: { invoices: 1, purchaseOrders: 0 } },
    ];

    // The reports route calls prisma directly (not through our mocked fns for list routes)
    // It uses Promise.all with findMany calls
    mockInvoiceFindMany.mockResolvedValueOnce(mockInvoices);
    mockPOFindMany.mockResolvedValueOnce([]);
    mockCustomerFindMany.mockResolvedValueOnce(mockCustomers);

    const req = makeRequest("http://localhost:3000/api/reports");
    const res = await reportGET();
    const body = await res.json();

    // With M3 fix, two customers with same name should have separate revenue entries
    expect(body.customerRevenue).toHaveLength(2);
    expect(body.customerRevenue[0].totalRevenue).toBe(1000);
    expect(body.customerRevenue[1].totalRevenue).toBe(500);
    // Each entry should have an id field
    expect(body.customerRevenue[0]).toHaveProperty("id");
    expect(body.customerRevenue[0].id).toBe("cust-1");
    expect(body.customerRevenue[1].id).toBe("cust-2");
  });
});

// ---------------------------------------------------------------------------
// M4: Customer PUT and DELETE endpoints
// ---------------------------------------------------------------------------

describe("M4: Customer PUT endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a customer successfully", async () => {
    const updated = { id: "cust-1", name: "Updated Corp", email: "new@test.com", _count: { invoices: 0, purchaseOrders: 0 } };
    mockCustomerUpdate.mockResolvedValueOnce(updated);

    const req = makeRequest("http://localhost:3000/api/customers/cust-1", {
      name: "Updated Corp",
      email: "new@test.com",
    }, "PUT");

    const res = await customerPUT(req, { params: Promise.resolve({ id: "cust-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Corp");
  });

  it("returns 404 when customer does not exist", async () => {
    mockCustomerUpdate.mockRejectedValueOnce(makePrismaError("P2025"));

    const req = makeRequest("http://localhost:3000/api/customers/nonexistent", {
      name: "Test",
    }, "PUT");

    const res = await customerPUT(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid data", async () => {
    const req = makeRequest("http://localhost:3000/api/customers/cust-1", {
      email: "not-an-email",
    }, "PUT");

    const res = await customerPUT(req, { params: Promise.resolve({ id: "cust-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty body (M6)", async () => {
    const req = makeRequest("http://localhost:3000/api/customers/cust-1", {}, "PUT");

    const res = await customerPUT(req, { params: Promise.resolve({ id: "cust-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No fields to update");
  });
});

describe("M4: Customer DELETE endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a customer with no related records", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({
      id: "cust-1",
      name: "Test",
      _count: { invoices: 0, purchaseOrders: 0 },
    });
    mockCustomerDelete.mockResolvedValueOnce({ id: "cust-1" });

    const req = makeRequest("http://localhost:3000/api/customers/cust-1", undefined, "DELETE");
    const res = await customerDELETE(req, { params: Promise.resolve({ id: "cust-1" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when customer does not exist", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce(null);

    const req = makeRequest("http://localhost:3000/api/customers/nonexistent", undefined, "DELETE");
    const res = await customerDELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });

  it("returns 409 when customer has related invoices/POs", async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({
      id: "cust-1",
      name: "Test",
      _count: { invoices: 3, purchaseOrders: 1 },
    });

    const req = makeRequest("http://localhost:3000/api/customers/cust-1", undefined, "DELETE");
    const res = await customerDELETE(req, { params: Promise.resolve({ id: "cust-1" }) });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Cannot delete customer");
  });
});

// ---------------------------------------------------------------------------
// M5: ZodError detection uses instanceof (not error.name)
// ---------------------------------------------------------------------------

describe("M5: ZodError instanceof detection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("catches ZodError via instanceof on invoice POST", async () => {
    // Send invalid data that will fail Zod validation
    const req = makeRequest("http://localhost:3000/api/invoices", {
      // Missing required fields
      customerId: "",
    }, "POST");

    const res = await invoicePOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("catches ZodError via instanceof on PO POST", async () => {
    const req = makeRequest("http://localhost:3000/api/purchase-orders", {
      customerId: "",
    }, "POST");

    const res = await poPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("catches ZodError via instanceof on invoice PUT", async () => {
    // Send data that triggers Zod error — lineItems with invalid items
    const req = makeRequest("http://localhost:3000/api/invoices/inv-1", {
      lineItems: [{ description: "", quantity: -1, unitPrice: -5 }],
    }, "PUT");

    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("catches ZodError via instanceof on PO PUT", async () => {
    const req = makeRequest("http://localhost:3000/api/purchase-orders/po-1", {
      lineItems: [{ description: "", quantity: -1, unitPrice: -5 }],
    }, "PUT");

    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

// ---------------------------------------------------------------------------
// M6: Empty-body PUT rejected with 400
// ---------------------------------------------------------------------------

describe("M6: Empty-body PUT rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const txClient = {
        lineItem: { deleteMany: mockDeleteMany },
        invoice: { update: mockInvoiceUpdate },
        pOLineItem: { deleteMany: mockPOLineItemDeleteMany },
        purchaseOrder: { update: mockPOUpdate },
      };
      return cb(txClient);
    });
  });

  it("returns 400 for empty invoice PUT body", async () => {
    const req = makeRequest("http://localhost:3000/api/invoices/inv-1", {}, "PUT");
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No fields to update");
  });

  it("returns 400 for empty PO PUT body", async () => {
    const req = makeRequest("http://localhost:3000/api/purchase-orders/po-1", {}, "PUT");
    const res = await purchaseOrderPUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No fields to update");
  });

  it("accepts PUT with at least one field", async () => {
    mockInvoiceUpdateDirect.mockResolvedValueOnce({ id: "inv-1", status: "sent" });

    const req = makeRequest("http://localhost:3000/api/invoices/inv-1", { status: "sent" }, "PUT");
    const res = await invoicePUT(req, { params: Promise.resolve({ id: "inv-1" }) });

    expect(res.status).toBe(200);
  });
});
