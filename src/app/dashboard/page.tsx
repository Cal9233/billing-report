"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { StatusBadge } from "@/components/shared/status-badge";

interface ReportData {
  invoiceSummary: {
    total: number;
    totalAmount: number;
    byStatus: Record<string, number>;
    paidAmount: number;
    outstandingAmount: number;
  };
  poSummary: {
    total: number;
    totalAmount: number;
    byStatus: Record<string, number>;
  };
  monthlyData: {
    month: string;
    invoiced: number;
    collected: number;
    purchased: number;
  }[];
  customerRevenue: {
    id: string;
    name: string;
    invoiceCount: number;
    totalRevenue: number;
  }[];
  recentInvoices: {
    id: string;
    number: string;
    customer: string;
    total: number;
    status: string;
    date: string;
  }[];
  recentPOs: {
    id: string;
    number: string;
    customer: string;
    total: number;
    status: string;
    date: string;
  }[];
  customerCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-72 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border p-6 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
              <div className="h-8 w-32 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          Failed to load dashboard data. Please refresh.
        </p>
      </div>
    );
  }

  // Provide safe fallback values for nested properties
  const invoiceSummary = data.invoiceSummary ?? {
    total: 0,
    totalAmount: 0,
    byStatus: {},
    paidAmount: 0,
    outstandingAmount: 0,
  };

  const poSummary = data.poSummary ?? {
    total: 0,
    totalAmount: 0,
    byStatus: {},
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(invoiceSummary.totalAmount ?? 0),
      subtitle: `${invoiceSummary.total ?? 0} total invoices`,
      icon: DollarSign,
      accent: "#16a34a",
      accentBg: "#f0fdf4",
      href: "/invoices",
    },
    {
      title: "Collected",
      value: formatCurrency(invoiceSummary.paidAmount ?? 0),
      subtitle: `${invoiceSummary.byStatus?.paid ?? 0} paid invoices`,
      icon: TrendingUp,
      accent: "#2563eb",
      accentBg: "#eff6ff",
      href: "/invoices?status=paid",
    },
    {
      title: "Outstanding",
      value: formatCurrency(invoiceSummary.outstandingAmount ?? 0),
      subtitle: `${((invoiceSummary.byStatus?.sent ?? 0) + (invoiceSummary.byStatus?.overdue ?? 0))} pending`,
      icon: AlertTriangle,
      accent: "#d97706",
      accentBg: "#fffbeb",
      href: "/invoices?status=sent",
    },
    {
      title: "Purchase Orders",
      value: formatCurrency(poSummary.totalAmount ?? 0),
      subtitle: `${poSummary.total ?? 0} total orders`,
      icon: ShoppingCart,
      accent: "#7c3aed",
      accentBg: "#f5f3ff",
      href: "/purchase-orders",
    },
    {
      title: "Customers",
      value: (data.customerCount ?? 0).toString(),
      subtitle: "Active accounts",
      icon: Users,
      accent: "#0891b2",
      accentBg: "#ecfeff",
      href: "/customers",
    },
    {
      title: "Overdue",
      value: (invoiceSummary.byStatus?.overdue ?? 0).toString(),
      subtitle: (invoiceSummary.byStatus?.overdue ?? 0) > 0
        ? "Needs immediate attention"
        : "None — all clear",
      icon: FileText,
      accent: "#dc2626",
      accentBg: "#fef2f2",
      href: "/invoices?status=overdue",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-base text-muted-foreground mt-1">
          Your billing overview at a glance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group block bg-white rounded-xl border border-border p-6 hover:border-blue-200 hover:shadow-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1.5">
                  {card.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: card.accentBg }}
              >
                <card.icon
                  className="h-5 w-5"
                  style={{ color: card.accent }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground">
            Monthly Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Last 12 months of activity
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.monthlyData ?? []}
              barGap={4}
              barCategoryGap="30%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f3f4f6"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                fontSize={12}
                tick={{ fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                fontSize={12}
                tick={{ fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
                  fontSize: "13px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "16px" }} />
              <Bar
                dataKey="invoiced"
                name="Invoiced"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="collected"
                name="Collected"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="purchased"
                name="Purchased"
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Recent Invoices
            </h2>
            <Link
              href="/invoices"
              className="flex items-center gap-1 text-sm text-primary hover:text-blue-700 font-medium transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(data.recentInvoices?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No invoices yet
              </p>
            ) : (
              (data.recentInvoices ?? []).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {inv.number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {inv.customer}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(inv.total)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent POs */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Recent Purchase Orders
            </h2>
            <Link
              href="/purchase-orders"
              className="flex items-center gap-1 text-sm text-primary hover:text-blue-700 font-medium transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(data.recentPOs?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No purchase orders yet
              </p>
            ) : (
              (data.recentPOs ?? []).map((po) => (
                <Link
                  key={po.id}
                  href={`/purchase-orders/${po.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {po.number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {po.customer}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <StatusBadge status={po.status} />
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(po.total)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      {(data.customerRevenue?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Top Customers by Revenue
            </h2>
            <Link
              href="/customers"
              className="flex items-center gap-1 text-sm text-primary hover:text-blue-700 font-medium transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(data.customerRevenue ?? []).map((customer, i) => (
              <div
                key={customer.id}
                className="flex items-center gap-4 px-6 py-3.5"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-primary text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {customer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {customer.invoiceCount} invoice
                    {customer.invoiceCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(customer.totalRevenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
