"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Printer,
  Edit,
  Trash2,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((res) => res.json())
      .then(setInvoice)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
      router.push("/invoices");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/invoices/${params.id}/pdf`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-destructive">Invoice not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Invoice Content (printable) */}
      <Card>
        <CardContent className="p-8">
          {/* Header Section */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">INVOICE</h2>
              <p className="text-sm text-muted-foreground">
                Invoice #: {invoice.invoiceNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                Issue Date: {formatDate(invoice.issueDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                Due Date: {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg">Your Company Name</h3>
              <p className="text-sm text-muted-foreground">123 Business Street</p>
              <p className="text-sm text-muted-foreground">City, State 12345</p>
              <p className="text-sm text-muted-foreground">contact@company.com</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">BILL TO</p>
            <p className="font-semibold">{invoice.customer.name}</p>
            {invoice.customer.email && (
              <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
            )}
            {invoice.customer.address && (
              <p className="text-sm text-muted-foreground">{invoice.customer.address}</p>
            )}
            {(invoice.customer.city || invoice.customer.state || invoice.customer.zip) && (
              <p className="text-sm text-muted-foreground">
                {[invoice.customer.city, invoice.customer.state, invoice.customer.zip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-3 text-sm font-semibold">Description</th>
                <th className="text-center py-3 text-sm font-semibold">Qty</th>
                <th className="text-right py-3 text-sm font-semibold">Unit Price</th>
                <th className="text-right py-3 text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3 text-sm">{item.description}</td>
                  <td className="py-3 text-sm text-center">{item.quantity}</td>
                  <td className="py-3 text-sm text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-3 text-sm text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    Tax ({invoice.taxRate}%)
                  </span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-primary font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="mt-8 pt-6 border-t border-border space-y-4">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Notes
                  </h4>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
