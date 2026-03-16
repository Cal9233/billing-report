"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download, Printer, Edit, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  customer: {
    id: string;
    companyName: string;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchase-orders/${params.id}`)
      .then((res) => res.json())
      .then(setPO)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Delete this purchase order?")) return;
    try {
      await fetch(`/api/purchase-orders/${params.id}`, { method: "DELETE" });
      window.location.href = "/purchase-orders";
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      alert("Failed to delete purchase order. Please try again.");
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/purchase-orders/${params.id}/pdf`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading purchase order...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        Purchase order not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to purchase orders"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{po.poNumber}</h1>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Issued {formatDate(po.issueDate)}
              {po.dueDate && ` · Due ${formatDate(po.dueDate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* PO Content */}
      <div className="bg-white rounded-xl border border-border p-8">
        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-success mb-2">
              PURCHASE ORDER
            </h2>
            <p className="text-sm text-muted-foreground">
              PO #: {po.poNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              Issue Date: {formatDate(po.issueDate)}
            </p>
            {po.dueDate && (
              <p className="text-sm text-muted-foreground">
                Due: {formatDate(po.dueDate)}
              </p>
            )}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-lg">Your Company Name</h3>
            <p className="text-sm text-muted-foreground">123 Business Street</p>
            <p className="text-sm text-muted-foreground">City, State 12345</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
            Vendor
          </p>
          <p className="font-semibold text-base">{po.customer.companyName}</p>
          {po.customer.email && (
            <p className="text-sm text-muted-foreground">{po.customer.email}</p>
          )}
          {po.customer.address && (
            <p className="text-sm text-muted-foreground">
              {po.customer.address}
            </p>
          )}
          {(po.customer.city || po.customer.state || po.customer.zip) && (
            <p className="text-sm text-muted-foreground">
              {[po.customer.city, po.customer.state, po.customer.zip]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-success">
              <th className="text-left py-3 text-sm font-semibold">
                Description
              </th>
              <th className="text-center py-3 text-sm font-semibold">Qty</th>
              <th className="text-right py-3 text-sm font-semibold">
                Unit Price
              </th>
              <th className="text-right py-3 text-sm font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b border-border ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}
              >
                <td className="py-3 text-sm">{item.description}</td>
                <td className="py-3 text-sm text-center">{item.quantity}</td>
                <td className="py-3 text-sm text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-3 text-sm text-right font-medium">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(po.subtotal)}</span>
            </div>
            {po.taxRate > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Tax ({po.taxRate}%)
                </span>
                <span>{formatCurrency(po.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-success font-bold text-lg">
              <span>Total</span>
              <span className="text-success">{formatCurrency(po.total)}</span>
            </div>
          </div>
        </div>

        {(po.notes || po.terms) && (
          <div className="mt-8 pt-6 border-t border-border space-y-4">
            {po.notes && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  Notes
                </h4>
                <p className="text-sm">{po.notes}</p>
              </div>
            )}
            {po.terms && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  Terms & Conditions
                </h4>
                <p className="text-sm">{po.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
