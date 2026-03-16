import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/db/client";
import { generateReport } from "@/lib/services/report.service";

// Mock Prisma
vi.mock("@/lib/db/client", () => ({
  default: {
    invoice: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Shared dates for deterministic tests
const NOW = new Date();
const CREATED_AT = new Date("2024-01-01T00:00:00.000Z");
const UPDATED_AT = new Date("2024-01-02T00:00:00.000Z");
const DUE_DATE = new Date("2024-02-01T00:00:00.000Z");
const TEST_ORG_ID = "org-test-123";

/** Build a minimal Invoice mock with all required schema fields. */
function makeInvoice(overrides: {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  total: number;
  customerId: string;
  customer: { id: string; companyName: string };
}) {
  return {
    ...overrides,
    dueDate: DUE_DATE,
    subtotal: overrides.total,
    taxRate: 0,
    taxAmount: 0,
    notes: null,
    terms: null,
    organizationId: TEST_ORG_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

/** Build a minimal PurchaseOrder mock with all required schema fields. */
function makePO(overrides: {
  id: string;
  poNumber: string;
  status: string;
  issueDate: Date;
  total: number;
  customerId: string;
  customer: { id: string; companyName: string };
}) {
  return {
    ...overrides,
    dueDate: null,
    subtotal: overrides.total,
    taxRate: 0,
    taxAmount: 0,
    notes: null,
    terms: null,
    organizationId: TEST_ORG_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

/** Build a minimal Customer mock with all required schema fields. */
function makeCustomer(overrides: { id: string; companyName: string }) {
  return {
    ...overrides,
    contactName: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    country: "US",
    organizationId: TEST_ORG_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

describe("Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateReport", () => {
    it("returns empty report when no data exists", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(0);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.invoiceSummary.total).toBe(0);
      expect(report.invoiceSummary.totalAmount).toBe(0);
      expect(report.invoiceSummary.paidAmount).toBe(0);
      expect(report.invoiceSummary.outstandingAmount).toBe(0);
      expect(report.poSummary.total).toBe(0);
      expect(report.poSummary.totalAmount).toBe(0);
      expect(report.customerCount).toBe(0);
      expect(report.customerRevenue.length).toBe(0);
    });

    it("calculates invoice summary correctly", async () => {
      const mockInvoices = [
        makeInvoice({
          id: "inv1",
          invoiceNumber: "INV-001",
          status: "paid",
          issueDate: new Date("2024-01-15"),
          total: 1000,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv2",
          invoiceNumber: "INV-002",
          status: "sent",
          issueDate: new Date("2024-02-20"),
          total: 500,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv3",
          invoiceNumber: "INV-003",
          status: "overdue",
          issueDate: new Date("2024-03-10"),
          total: 750,
          customerId: "cust2",
          customer: { id: "cust2", companyName: "Customer B" },
        }),
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(2);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.invoiceSummary.total).toBe(3);
      expect(report.invoiceSummary.totalAmount).toBe(2250);
      expect(report.invoiceSummary.byStatus.paid).toBe(1);
      expect(report.invoiceSummary.byStatus.sent).toBe(1);
      expect(report.invoiceSummary.byStatus.overdue).toBe(1);
      expect(report.invoiceSummary.paidAmount).toBe(1000);
      expect(report.invoiceSummary.outstandingAmount).toBe(1250); // sent + overdue
    });

    it("calculates PO summary correctly", async () => {
      const mockPOs = [
        makePO({
          id: "po1",
          poNumber: "PO-001",
          status: "approved",
          issueDate: new Date("2024-01-10"),
          total: 5000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
        makePO({
          id: "po2",
          poNumber: "PO-002",
          status: "received",
          issueDate: new Date("2024-02-15"),
          total: 3000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(1);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.poSummary.total).toBe(2);
      expect(report.poSummary.totalAmount).toBe(8000);
      expect(report.poSummary.byStatus.approved).toBe(1);
      expect(report.poSummary.byStatus.received).toBe(1);
    });

    it("groups customers correctly by revenue", async () => {
      const mockInvoices = [
        makeInvoice({
          id: "inv1",
          invoiceNumber: "INV-001",
          status: "paid",
          issueDate: new Date("2024-01-15"),
          total: 1000,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv2",
          invoiceNumber: "INV-002",
          status: "paid",
          issueDate: new Date("2024-01-20"),
          total: 500,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv3",
          invoiceNumber: "INV-003",
          status: "paid",
          issueDate: new Date("2024-02-10"),
          total: 2000,
          customerId: "cust2",
          customer: { id: "cust2", companyName: "Customer B" },
        }),
      ];

      const mockCustomers = [
        makeCustomer({ id: "cust1", companyName: "Customer A" }),
        makeCustomer({ id: "cust2", companyName: "Customer B" }),
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers);
      vi.mocked(prisma.customer.count).mockResolvedValue(2);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.customerRevenue.length).toBe(2);
      expect(report.customerRevenue[0].name).toBe("Customer B"); // highest revenue
      expect(report.customerRevenue[0].totalRevenue).toBe(2000);
      expect(report.customerRevenue[0].invoiceCount).toBe(1);
      expect(report.customerRevenue[1].name).toBe("Customer A");
      expect(report.customerRevenue[1].totalRevenue).toBe(1500);
      expect(report.customerRevenue[1].invoiceCount).toBe(2);
    });

    it("limits customer revenue to top 10", async () => {
      const mockInvoices = Array.from({ length: 15 }, (_, i) =>
        makeInvoice({
          id: `inv${i}`,
          invoiceNumber: `INV-${String(i + 1).padStart(3, "0")}`,
          status: "paid",
          issueDate: new Date("2024-01-15"),
          total: 100 * (i + 1),
          customerId: `cust${i}`,
          customer: { id: `cust${i}`, companyName: `Customer ${i}` },
        })
      );

      const mockCustomers = Array.from({ length: 15 }, (_, i) =>
        makeCustomer({ id: `cust${i}`, companyName: `Customer ${i}` })
      );

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers);
      vi.mocked(prisma.customer.count).mockResolvedValue(15);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.customerRevenue.length).toBe(10);
      expect(report.customerRevenue[0].totalRevenue).toBe(100 * 15); // highest
      expect(report.customerRevenue[9].totalRevenue).toBe(100 * 6); // 10th highest
    });

    it("generates 12 months of monthly data", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(0);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.monthlyData.length).toBe(12);
      report.monthlyData.forEach((m) => {
        expect(m.month).toMatch(/^\w+ \d{4}$/); // format: "Jan 2024"
        expect(m.invoiced).toBe(0);
        expect(m.collected).toBe(0);
        expect(m.purchased).toBe(0);
      });
    });

    it("calculates monthly data correctly with invoices and POs", async () => {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const mockInvoices = [
        makeInvoice({
          id: "inv1",
          invoiceNumber: "INV-001",
          status: "paid",
          issueDate: currentMonth,
          total: 1000,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
      ];

      const mockPOs = [
        makePO({
          id: "po1",
          poNumber: "PO-001",
          status: "approved",
          issueDate: currentMonth,
          total: 5000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(0);

      const report = await generateReport(TEST_ORG_ID);

      const currentMonthData = report.monthlyData[report.monthlyData.length - 1]; // last month
      expect(currentMonthData.invoiced).toBe(1000);
      expect(currentMonthData.collected).toBe(1000); // paid status
      expect(currentMonthData.purchased).toBe(5000);
    });

    it("returns recent invoices (max 5)", async () => {
      const mockInvoices = Array.from({ length: 10 }, (_, i) =>
        makeInvoice({
          id: `inv${i}`,
          invoiceNumber: `INV-${String(i + 1).padStart(3, "0")}`,
          status: "sent",
          issueDate: new Date(`2024-0${Math.floor(i / 3) + 1}-15`),
          total: 100 * (i + 1),
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        })
      );

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(1);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.recentInvoices.length).toBe(5);
      expect(report.recentInvoices[0].number).toBe("INV-001");
      expect(report.recentInvoices[4].number).toBe("INV-005");
    });

    it("returns recent purchase orders (max 5)", async () => {
      const mockPOs = Array.from({ length: 8 }, (_, i) =>
        makePO({
          id: `po${i}`,
          poNumber: `PO-${String(i + 1).padStart(3, "0")}`,
          status: "submitted",
          issueDate: new Date(`2024-0${Math.floor(i / 3) + 1}-10`),
          total: 500 * (i + 1),
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        })
      );

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(1);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.recentPOs.length).toBe(5);
      expect(report.recentPOs[0].number).toBe("PO-001");
      expect(report.recentPOs[4].number).toBe("PO-005");
    });

    it("includes all status types in summaries", async () => {
      const mockInvoices = [
        makeInvoice({
          id: "inv1",
          invoiceNumber: "INV-001",
          status: "draft",
          issueDate: new Date(),
          total: 100,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv2",
          invoiceNumber: "INV-002",
          status: "sent",
          issueDate: new Date(),
          total: 200,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv3",
          invoiceNumber: "INV-003",
          status: "paid",
          issueDate: new Date(),
          total: 300,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv4",
          invoiceNumber: "INV-004",
          status: "overdue",
          issueDate: new Date(),
          total: 400,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
        makeInvoice({
          id: "inv5",
          invoiceNumber: "INV-005",
          status: "cancelled",
          issueDate: new Date(),
          total: 500,
          customerId: "cust1",
          customer: { id: "cust1", companyName: "Customer A" },
        }),
      ];

      const mockPOs = [
        makePO({
          id: "po1",
          poNumber: "PO-001",
          status: "draft",
          issueDate: new Date(),
          total: 1000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
        makePO({
          id: "po2",
          poNumber: "PO-002",
          status: "submitted",
          issueDate: new Date(),
          total: 2000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
        makePO({
          id: "po3",
          poNumber: "PO-003",
          status: "approved",
          issueDate: new Date(),
          total: 3000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
        makePO({
          id: "po4",
          poNumber: "PO-004",
          status: "received",
          issueDate: new Date(),
          total: 4000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
        makePO({
          id: "po5",
          poNumber: "PO-005",
          status: "cancelled",
          issueDate: new Date(),
          total: 5000,
          customerId: "vendor1",
          customer: { id: "vendor1", companyName: "Vendor A" },
        }),
      ];

      vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      vi.mocked(prisma.customer.count).mockResolvedValue(2);

      const report = await generateReport(TEST_ORG_ID);

      expect(report.invoiceSummary.byStatus.draft).toBe(1);
      expect(report.invoiceSummary.byStatus.sent).toBe(1);
      expect(report.invoiceSummary.byStatus.paid).toBe(1);
      expect(report.invoiceSummary.byStatus.overdue).toBe(1);
      expect(report.invoiceSummary.byStatus.cancelled).toBe(1);

      expect(report.poSummary.byStatus.draft).toBe(1);
      expect(report.poSummary.byStatus.submitted).toBe(1);
      expect(report.poSummary.byStatus.approved).toBe(1);
      expect(report.poSummary.byStatus.received).toBe(1);
      expect(report.poSummary.byStatus.cancelled).toBe(1);
    });
  });
});
