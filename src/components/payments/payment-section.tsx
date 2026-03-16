"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PlusCircle,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { PaymentForm } from "./payment-form";

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  notes: string | null;
}

interface PaymentSummary {
  invoiceTotal: number;
  totalPaid: number;
  remaining: number;
  paymentCount: number;
  payments: Payment[];
}

interface PaymentSectionProps {
  invoiceId: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export function PaymentSection({ invoiceId }: PaymentSectionProps) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (payment: Payment) => {
    const confirmed = window.confirm(
      `Delete this payment of ${formatCurrency(payment.amount)}?`
    );
    if (!confirmed) return;

    setDeletingId(payment.id);
    try {
      await fetch(
        `/api/invoices/${invoiceId}/payments?paymentId=${payment.id}`,
        { method: "DELETE" }
      );
      await fetchPayments();
    } catch (err) {
      console.error("Failed to delete payment:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowForm(false);
    await fetchPayments();
  };

  if (loading) {
    return (
      <div className="payment-section-skeleton">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-24 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!summary) return null;

  const paidPercent =
    summary.invoiceTotal > 0
      ? Math.min(100, (summary.totalPaid / summary.invoiceTotal) * 100)
      : 0;

  const isFullyPaid = summary.remaining <= 0;
  const isPartiallyPaid = summary.totalPaid > 0 && summary.remaining > 0;

  return (
    <div className="no-print mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Payments</h3>
        </div>
        {!isFullyPaid && !showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            Record Payment
          </Button>
        )}
      </div>

      {/* Balance summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Invoice Total
          </p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(summary.invoiceTotal)}
          </p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Amount Paid
          </p>
          <p className="text-xl font-bold text-success">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 border ${
            isFullyPaid
              ? "bg-green-50 border-green-200"
              : isPartiallyPaid
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-border"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isFullyPaid
                ? "text-green-600"
                : isPartiallyPaid
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            Balance Due
          </p>
          <p
            className={`text-xl font-bold ${
              isFullyPaid
                ? "text-green-700"
                : isPartiallyPaid
                  ? "text-amber-700"
                  : "text-foreground"
            }`}
          >
            {formatCurrency(summary.remaining)}
          </p>
        </div>
      </div>

      {/* Payment status indicator */}
      {isFullyPaid ? (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Invoice Fully Paid
            </p>
            <p className="text-xs text-green-600">
              All {formatCurrency(summary.invoiceTotal)} received
            </p>
          </div>
          <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold badge-paid">
            PAID
          </span>
        </div>
      ) : isPartiallyPaid ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-800">
                Partially Paid
              </p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                {Math.round(paidPercent)}% Paid
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
              role="progressbar"
              aria-valuenow={paidPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-xs text-amber-600 mt-1.5">
            {formatCurrency(summary.remaining)} still outstanding
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            No payments recorded — {formatCurrency(summary.invoiceTotal)} due
          </p>
        </div>
      )}

      {/* Record payment inline form */}
      {showForm && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-800">
              Record Payment
            </h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-blue-500 hover:text-blue-700 text-sm"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
          <PaymentForm
            invoiceId={invoiceId}
            remainingBalance={summary.remaining}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Payment history */}
      {summary.payments.length > 0 ? (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-gray-50/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Payment History ({summary.paymentCount})
            </p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Method
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Notes
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {summary.payments.map((payment, idx) => (
                <tr
                  key={payment.id}
                  className={`border-b border-border last:border-0 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDate(payment.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {METHOD_LABELS[payment.method] ?? payment.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {payment.notes ?? (
                      <span className="text-gray-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right text-success">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(payment)}
                      disabled={deletingId === payment.id}
                      className="text-gray-300 hover:text-destructive transition-colors disabled:opacity-40"
                      aria-label={`Delete payment of ${formatCurrency(payment.amount)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-6 bg-white border border-border rounded-lg">
            <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No payments recorded yet
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowForm(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Record First Payment
            </Button>
          </div>
        )
      )}
    </div>
  );
}
