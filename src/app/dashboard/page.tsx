"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Users,
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
    fetch("/api/reports", { next: { revalidate: 60 } })
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Failed to load dashboard data</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(data.invoiceSummary.totalAmount),
      subtitle: `${data.invoiceSummary.total} invoices`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Collected",
      value: formatCurrency(data.invoiceSummary.paidAmount),
      subtitle: `${data.invoiceSummary.byStatus.paid || 0} paid`,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Outstanding",
      value: formatCurrency(data.invoiceSummary.outstandingAmount),
      subtitle: `${(data.invoiceSummary.byStatus.sent || 0) + (data.invoiceSummary.byStatus.overdue || 0)} pending`,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      title: "Purchase Orders",
      value: formatCurrency(data.poSummary.totalAmount),
      subtitle: `${data.poSummary.total} orders`,
      icon: ShoppingCart,
      color: "text-purple-600",
    },
    {
      title: "Customers",
      value: data.customerCount.toString(),
      subtitle: "Active accounts",
      icon: Users,
      color: "text-indigo-600",
    },
    {
      title: "Overdue",
      value: (data.invoiceSummary.byStatus.overdue || 0).toString(),
      subtitle: "Needs attention",
      icon: FileText,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your billing and purchase activity
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                </div>
                <card.icon className={`h-10 w-10 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
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
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Link
              href="/invoices"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(inv.total)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : inv.status === "sent"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
              {data.recentInvoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No invoices yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent POs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Purchase Orders</CardTitle>
            <Link
              href="/purchase-orders"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentPOs.map((po) => (
                <Link
                  key={po.id}
                  href={`/purchase-orders/${po.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{po.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {po.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(po.total)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        po.status === "received"
                          ? "bg-green-100 text-green-700"
                          : po.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : po.status === "submitted"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                </Link>
              ))}
              {data.recentPOs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No purchase orders yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      {data.customerRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.customerRevenue.map((customer, i) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.invoiceCount} invoices
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(customer.totalRevenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
