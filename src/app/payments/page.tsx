"use client";

// Payments page — fetches from GET /api/payments with server-side search and method filtering.

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Search } from "lucide-react";

interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  method: string;
  date: string;
  notes: string | null;
}

// Payment method display labels
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  wire: "Wire",
  ach: "ACH",
  other: "Other",
};

function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
}

const PAYMENT_METHODS = [
  { value: "", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "wire", label: "Wire" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("search", search);
    if (methodFilter) params.set("method", methodFilter);

    fetch(`/api/payments?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payments");
        return res.json();
      })
      .then((res) => {
        setPayments(res.data ?? []);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch payments:", err);
        setError("Could not load payments. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [search, methodFilter]);

  // Filtering is now server-side via /api/payments query params
  const filtered = payments;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-base text-muted-foreground mt-1">
            Track all received payments
          </p>
        </div>
      </div>

      {/* Search + Method filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-lg border-2 border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            aria-label="Search payments"
          />
        </div>
        <div role="group" aria-label="Filter by payment method" className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethodFilter(m.value)}
              aria-pressed={methodFilter === m.value}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                methodFilter === m.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? "Loading payments..."
          : `${filtered.length} payment${filtered.length !== 1 ? "s" : ""} shown`}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-32 bg-gray-100 rounded flex-1" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Failed to load payments</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            {search || methodFilter ? "No matching payments" : "No payments recorded"}
          </p>
          <p className="text-sm text-muted-foreground">
            {search || methodFilter
              ? "Try a different search or filter"
              : "Payments will appear here once invoices are marked paid"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">
              {filtered.length} payment{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th
                    scope="col"
                    className="text-left py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Invoice #
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Method
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`border-b border-border last:border-0 hover:bg-blue-50/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="py-4 px-6 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.date)}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/invoices/${payment.invoiceId}`}
                        className="font-semibold text-primary hover:underline text-sm"
                      >
                        {payment.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-foreground">
                      {payment.customerName}
                    </td>
                    <td className="py-4 px-4">
                      {payment.method === "—" ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-blue-50 text-blue-700">
                          {methodLabel(payment.method)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground max-w-xs truncate">
                      {payment.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
