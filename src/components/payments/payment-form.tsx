"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PaymentFormProps {
  invoiceId: string;
  remainingBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function PaymentForm({
  invoiceId,
  remainingBalance,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [amount, setAmount] = useState<string>(
    remainingBalance > 0 ? remainingBalance.toFixed(2) : ""
  );
  const [date, setDate] = useState<string>(getTodayString());
  const [method, setMethod] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = parseFloat(amount);
  const isValidAmount =
    !isNaN(amountNum) && amountNum > 0 && amountNum <= remainingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          date,
          method,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to record payment");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Amount */}
        <div>
          <label
            htmlFor="payment-amount"
            className="block text-xs font-semibold text-foreground mb-1"
          >
            Amount
            <span className="text-muted-foreground font-normal ml-1">
              (max {formatCurrency(remainingBalance)})
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              $
            </span>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder="0.00"
            />
          </div>
          {!isNaN(amountNum) && amountNum > remainingBalance && (
            <p className="text-xs text-destructive mt-0.5">
              Cannot exceed remaining balance
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="payment-date"
            className="block text-xs font-semibold text-foreground mb-1"
          >
            Date
          </label>
          <input
            id="payment-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Method */}
      <div>
        <label
          htmlFor="payment-method"
          className="block text-xs font-semibold text-foreground mb-1"
        >
          Payment Method
        </label>
        <select
          id="payment-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="payment-notes"
          className="block text-xs font-semibold text-foreground mb-1"
        >
          Notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="payment-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
          placeholder="e.g. Partial payment, check #1042..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !isValidAmount || !date}
          className="min-w-[120px]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Payment"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
