import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Declare mocks with vi.hoisted so they're available in the hoisted vi.mock factory
const {
  mockDeleteMany,
  mockInvoiceUpdate,
  mockPOLineItemDeleteMany,
  mockPOUpdate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockInvoiceUpdate: vi.fn().mockResolvedValue({ id: "inv-1" }),
  mockPOLineItemDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockPOUpdate: vi.fn().mockResolvedValue({ id: "po-1" }),
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
      update: vi.fn().mockResolvedValue({ id: "inv-1" }),
      delete: vi.fn().mockResolvedValue({ id: "inv-1" }),
    },
    purchaseOrder: {
      findUnique: vi.fn().mockResolvedValue({ id: "po-1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "po-1" }),
      update: vi.fn().mockResolvedValue({ id: "po-1" }),
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

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validLineItems = [
  { description: "Service A", quantity: 2, unitPrice: 100 },
  { description: "Service B", quantity: 1, unitPrice: 50 },
];

describe("Invoice PUT - transaction usage", () => {
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

  it("uses $transaction when updating line items", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 10,
    });

    await invoicePUT(request, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it("calls deleteMany inside the transaction callback", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 0,
    });

    await invoicePUT(request, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { invoiceId: "inv-1" },
    });
  });

  it("calls invoice.update inside the transaction callback", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 10,
    });

    await invoicePUT(request, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockInvoiceUpdate).toHaveBeenCalledTimes(1);
    expect(mockInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({
          lineItems: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ description: "Service A" }),
            ]),
          }),
        }),
      })
    );
  });

  it("executes deleteMany before update within transaction", async () => {
    const callOrder: string[] = [];
    mockDeleteMany.mockImplementation(async () => {
      callOrder.push("deleteMany");
      return { count: 0 };
    });
    mockInvoiceUpdate.mockImplementation(async () => {
      callOrder.push("update");
      return { id: "inv-1" };
    });

    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 0,
    });

    await invoicePUT(request, { params: Promise.resolve({ id: "inv-1" }) });

    expect(callOrder).toEqual(["deleteMany", "update"]);
  });

  it("does not use $transaction when no line items provided", async () => {
    const request = createRequest({ status: "sent" });

    await invoicePUT(request, { params: Promise.resolve({ id: "inv-1" }) });

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("Purchase Order PUT - transaction usage", () => {
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

  it("uses $transaction when updating line items", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 5,
    });

    await purchaseOrderPUT(request, {
      params: Promise.resolve({ id: "po-1" }),
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it("calls pOLineItem.deleteMany inside the transaction callback", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 0,
    });

    await purchaseOrderPUT(request, {
      params: Promise.resolve({ id: "po-1" }),
    });

    expect(mockPOLineItemDeleteMany).toHaveBeenCalledWith({
      where: { purchaseOrderId: "po-1" },
    });
  });

  it("calls purchaseOrder.update inside the transaction callback", async () => {
    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 0,
    });

    await purchaseOrderPUT(request, {
      params: Promise.resolve({ id: "po-1" }),
    });

    expect(mockPOUpdate).toHaveBeenCalledTimes(1);
    expect(mockPOUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1" },
        data: expect.objectContaining({
          lineItems: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ description: "Service A" }),
            ]),
          }),
        }),
      })
    );
  });

  it("executes deleteMany before update within transaction", async () => {
    const callOrder: string[] = [];
    mockPOLineItemDeleteMany.mockImplementation(async () => {
      callOrder.push("deleteMany");
      return { count: 0 };
    });
    mockPOUpdate.mockImplementation(async () => {
      callOrder.push("update");
      return { id: "po-1" };
    });

    const request = createRequest({
      lineItems: validLineItems,
      taxRate: 0,
    });

    await purchaseOrderPUT(request, {
      params: Promise.resolve({ id: "po-1" }),
    });

    expect(callOrder).toEqual(["deleteMany", "update"]);
  });

  it("does not use $transaction when no line items provided", async () => {
    const request = createRequest({ status: "approved" });

    await purchaseOrderPUT(request, {
      params: Promise.resolve({ id: "po-1" }),
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
