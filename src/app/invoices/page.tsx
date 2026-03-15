"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { Plus, FileText, Trash2, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  customer: { id: string; name: string; email: string | null };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/api/invoices?status=${filter}` : "/api/invoices";
    fetch(url)
      .then((res) => res.json())
      .then((res) => setInvoices(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`))
      return;
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (error) {
      console.error("Failed to delete invoice:", error);
    }
  };

  const statuses = [
    { value: "", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          inv.customer.name.toLowerCase().includes(search.toLowerCase()),
      )
    : invoices;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage your invoices and billing
          </p>
        </div>
        <Link href="/invoices/new">
          <Button size="lg" className="gap-2 whitespace-nowrap">
            <Plus className="h-5 w-5" aria-hidden="true" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices or customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-lg border-2 border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            aria-label="Search invoices"
          />
        </div>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              aria-pressed={filter === s.value}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filter === s.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? "Loading invoices..."
          : `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""} shown`}
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
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            {search || filter ? "No matching invoices" : "No invoices yet"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {search || filter
              ? "Try a different search or filter"
              : "Create your first invoice to get started"}
          </p>
          {!search && !filter && (
            <Link href="/invoices/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
              {filter && ` · ${getStatusLabel(filter)}`}
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
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Issue Date
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Due Date
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-border last:border-0 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}
                  >
                    <td className="py-4 px-6">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-semibold text-primary hover:underline text-sm"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-foreground">
                      {inv.customer.name}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-4 px-6 text-sm text-right font-semibold text-foreground tabular-nums">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View
                          </Button>
                        </Link>
                        <Link href={`/invoices/${inv.id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Edit
                          </Button>
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(inv.id, inv.invoiceNumber)
                          }
                          aria-label={`Delete invoice ${inv.invoiceNumber}`}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
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
