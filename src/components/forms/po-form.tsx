"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import type { LineItemInput } from "@/types";

interface Customer {
  id: string;
  companyName: string;
}

interface POFormProps {
  initialData?: {
    id?: string;
    customerId: string;
    issueDate: string;
    dueDate: string;
    taxRate: number;
    notes: string;
    terms: string;
    status: string;
    lineItems: LineItemInput[];
  };
  mode: "create" | "edit";
}

export function POForm({ initialData, mode }: POFormProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: initialData?.customerId || "",
    issueDate: initialData?.issueDate || new Date().toISOString().split("T")[0],
    dueDate: initialData?.dueDate || "",
    taxRate: initialData?.taxRate || 0,
    notes: initialData?.notes || "",
    terms: initialData?.terms || "Net 15",
    status: initialData?.status || "draft",
    lineItems: initialData?.lineItems || [
      { description: "", quantity: 1, unitPrice: 0 },
    ],
  });

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((res) => setCustomers(res.data))
      .catch(console.error);
  }, []);

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const subtotal = formData.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice, 0
  );
  const taxAmount = subtotal * (formData.taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        taxRate: Number(formData.taxRate),
        dueDate: formData.dueDate || undefined,
        lineItems: formData.lineItems.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const url = mode === "edit"
        ? `/api/purchase-orders/${initialData?.id}`
        : "/api/purchase-orders";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save purchase order");
      }

      const saved = await res.json();
      router.push(`/purchase-orders/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Purchase Order Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="po-vendor" className="block text-sm font-medium mb-1">Vendor</label>
              <select
                id="po-vendor"
                name="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                required
              >
                <option value="">Select a vendor...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="po-status" className="block text-sm font-medium mb-1">Status</label>
              <select
                id="po-status"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="po-issue-date" className="block text-sm font-medium mb-1">Issue Date</label>
              <Input id="po-issue-date" name="issueDate" type="date" value={formData.issueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="po-due-date" className="block text-sm font-medium mb-1">Due Date</label>
              <Input id="po-due-date" name="dueDate" type="date" value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="po-tax-rate" className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <Input id="po-tax-rate" name="taxRate" type="number" step="0.01" min="0" max="100" value={formData.taxRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} aria-label="Add line item">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Column headers — hidden on mobile, shown on md+ */}
            <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-muted-foreground" aria-hidden="true">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>
            {formData.lineItems.map((item, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3 md:border-0 md:p-0 md:flex-none md:grid md:grid-cols-12 md:gap-2 md:items-center">
                <div className="md:col-span-5">
                  <label htmlFor={`po-line-desc-${i}`} className="block text-xs font-medium text-muted-foreground mb-1 md:sr-only">Description</label>
                  <Input id={`po-line-desc-${i}`} placeholder="Item description" value={item.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)} required />
                </div>
                <div className="flex gap-2 md:contents">
                  <div className="flex-1 md:col-span-2">
                    <label htmlFor={`po-line-qty-${i}`} className="block text-xs font-medium text-muted-foreground mb-1 md:sr-only">Quantity</label>
                    <Input id={`po-line-qty-${i}`} type="number" min="0.01" step="0.01" value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      aria-label={`Quantity for line item ${i + 1}`} required />
                  </div>
                  <div className="flex-1 md:col-span-2">
                    <label htmlFor={`po-line-price-${i}`} className="block text-xs font-medium text-muted-foreground mb-1 md:sr-only">Unit Price</label>
                    <Input id={`po-line-price-${i}`} type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      aria-label={`Unit price for line item ${i + 1}`} required />
                  </div>
                </div>
                <div className="flex items-center justify-between md:contents">
                  <div className="md:col-span-2 md:text-right text-sm font-medium">
                    <span className="text-muted-foreground md:hidden">Amount: </span>
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <div className="md:col-span-1 md:text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(i)}
                      disabled={formData.lineItems.length <= 1}
                      aria-label={`Remove line item ${i + 1}`}
                      className="text-destructive min-w-[44px] min-h-[44px]">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {formData.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({formData.taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="po-notes" className="block text-sm font-medium mb-1">Notes</label>
            <textarea id="po-notes" name="notes" value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3} className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Additional notes..." />
          </div>
          <div>
            <label htmlFor="po-terms" className="block text-sm font-medium mb-1">Terms & Conditions</label>
            <textarea id="po-terms" name="terms" value={formData.terms}
              onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.value }))}
              rows={3} className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Payment terms..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : mode === "edit" ? "Update PO" : "Create PO"}
        </Button>
      </div>
    </form>
  );
}
