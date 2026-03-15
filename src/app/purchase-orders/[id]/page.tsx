"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { ArrowLeft, Download, Printer, Edit, Trash2 } from "lucide-react";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  issueDate: string;
  expectedDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  customer: {
    id: string;
    name: string;
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
    amount: number;
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
      router.push("/purchase-orders");
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      alert("Failed to delete purchase order. Please try again.");
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/purchase-orders/${params.id}/pdf`, "_blank");
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!po) return <div className="text-center py-12 text-destructive">Purchase order not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(po.status)}`}>
              {po.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /> Edit</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-success mb-2">PURCHASE ORDER</h2>
              <p className="text-sm text-muted-foreground">PO #: {po.poNumber}</p>
              <p className="text-sm text-muted-foreground">Issue Date: {formatDate(po.issueDate)}</p>
              {po.expectedDate && (
                <p className="text-sm text-muted-foreground">Expected: {formatDate(po.expectedDate)}</p>
              )}
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg">Your Company Name</h3>
              <p className="text-sm text-muted-foreground">123 Business Street</p>
              <p className="text-sm text-muted-foreground">City, State 12345</p>
            </div>
          </div>

          <div className="mb-8 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">VENDOR</p>
            <p className="font-semibold">{po.customer.name}</p>
            {po.customer.email && <p className="text-sm text-muted-foreground">{po.customer.email}</p>}
            {po.customer.address && <p className="text-sm text-muted-foreground">{po.customer.address}</p>}
            {(po.customer.city || po.customer.state || po.customer.zip) && (
              <p className="text-sm text-muted-foreground">
                {[po.customer.city, po.customer.state, po.customer.zip].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-success">
                <th className="text-left py-3 text-sm font-semibold">Description</th>
                <th className="text-center py-3 text-sm font-semibold">Qty</th>
                <th className="text-right py-3 text-sm font-semibold">Unit Price</th>
                <th className="text-right py-3 text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3 text-sm">{item.description}</td>
                  <td className="py-3 text-sm text-center">{item.quantity}</td>
                  <td className="py-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
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
                  <span className="text-muted-foreground">Tax ({po.taxRate}%)</span>
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
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-sm">{po.notes}</p>
                </div>
              )}
              {po.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Terms & Conditions</h4>
                  <p className="text-sm">{po.terms}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
