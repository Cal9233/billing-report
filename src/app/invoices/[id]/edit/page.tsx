"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { ArrowLeft } from "lucide-react";

export default function EditInvoicePage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((res) => res.json())
      .then(setInvoice)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-destructive">Invoice not found</div>;
  }

  const lineItems = (invoice.lineItems as Array<Record<string, unknown>>).map(
    (item) => ({
      description: item.description as string,
      quantity: item.quantity as number,
      unitPrice: item.unitPrice as number,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/invoices/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Invoice</h1>
          <p className="text-muted-foreground">
            {invoice.invoiceNumber as string}
          </p>
        </div>
      </div>
      <InvoiceForm
        mode="edit"
        initialData={{
          id: invoice.id as string,
          customerId: invoice.customerId as string,
          issueDate: (invoice.issueDate as string).split("T")[0],
          dueDate: (invoice.dueDate as string).split("T")[0],
          taxRate: invoice.taxRate as number,
          notes: (invoice.notes as string) || "",
          terms: (invoice.terms as string) || "",
          status: invoice.status as string,
          lineItems,
        }}
      />
    </div>
  );
}
