import { NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export async function GET() {
  try {
    // Get all invoices and POs for aggregate reporting
    const [invoices, purchaseOrders, customers] = await Promise.all([
      prisma.invoice.findMany({
        include: { customer: { select: { name: true } }, lineItems: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.purchaseOrder.findMany({
        include: { customer: { select: { name: true } }, lineItems: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.findMany({
        include: {
          _count: { select: { invoices: true, purchaseOrders: true } },
        },
      }),
    ]);

    // Invoice summary
    const invoiceSummary = {
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      byStatus: {
        draft: invoices.filter((i) => i.status === "draft").length,
        sent: invoices.filter((i) => i.status === "sent").length,
        paid: invoices.filter((i) => i.status === "paid").length,
        overdue: invoices.filter((i) => i.status === "overdue").length,
        cancelled: invoices.filter((i) => i.status === "cancelled").length,
      },
      paidAmount: invoices
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + i.total, 0),
      outstandingAmount: invoices
        .filter((i) => ["sent", "overdue"].includes(i.status))
        .reduce((sum, i) => sum + i.total, 0),
    };

    // PO summary
    const poSummary = {
      total: purchaseOrders.length,
      totalAmount: purchaseOrders.reduce((sum, po) => sum + po.total, 0),
      byStatus: {
        draft: purchaseOrders.filter((p) => p.status === "draft").length,
        submitted: purchaseOrders.filter((p) => p.status === "submitted").length,
        approved: purchaseOrders.filter((p) => p.status === "approved").length,
        received: purchaseOrders.filter((p) => p.status === "received").length,
        cancelled: purchaseOrders.filter((p) => p.status === "cancelled").length,
      },
    };

    // Monthly revenue data (last 12 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.issueDate);
        return d >= monthStart && d <= monthEnd;
      });

      const monthPOs = purchaseOrders.filter((po) => {
        const d = new Date(po.issueDate);
        return d >= monthStart && d <= monthEnd;
      });

      monthlyData.push({
        month: monthLabel,
        invoiced: monthInvoices.reduce((sum, i) => sum + i.total, 0),
        collected: monthInvoices
          .filter((i) => i.status === "paid")
          .reduce((sum, i) => sum + i.total, 0),
        purchased: monthPOs.reduce((sum, p) => sum + p.total, 0),
      });
    }

    // Top customers by revenue
    const customerRevenue = customers
      .map((c) => {
        const custInvoices = invoices.filter(
          (i) => i.customer.name === c.name
        );
        return {
          name: c.name,
          invoiceCount: custInvoices.length,
          totalRevenue: custInvoices.reduce((sum, i) => sum + i.total, 0),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Recent activity
    const recentInvoices = invoices.slice(0, 5).map((i) => ({
      id: i.id,
      number: i.invoiceNumber,
      customer: i.customer.name,
      total: i.total,
      status: i.status,
      date: i.issueDate,
    }));

    const recentPOs = purchaseOrders.slice(0, 5).map((p) => ({
      id: p.id,
      number: p.poNumber,
      customer: p.customer.name,
      total: p.total,
      status: p.status,
      date: p.issueDate,
    }));

    return NextResponse.json({
      invoiceSummary,
      poSummary,
      monthlyData,
      customerRevenue,
      recentInvoices,
      recentPOs,
      customerCount: customers.length,
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
