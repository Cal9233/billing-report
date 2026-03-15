"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { POForm } from "@/components/forms/po-form";
import { ArrowLeft } from "lucide-react";

export default function EditPOPage() {
  const params = useParams();
  const [po, setPO] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchase-orders/${params.id}`)
      .then((res) => res.json())
      .then(setPO)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!po) return <div className="text-center py-12 text-destructive">Purchase order not found</div>;

  const lineItems = (po.lineItems as Array<Record<string, unknown>>).map((item) => ({
    description: item.description as string,
    quantity: item.quantity as number,
    unitPrice: item.unitPrice as number,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/purchase-orders/${params.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Purchase Order</h1>
          <p className="text-muted-foreground">{po.poNumber as string}</p>
        </div>
      </div>
      <POForm
        mode="edit"
        initialData={{
          id: po.id as string,
          customerId: po.customerId as string,
          issueDate: (po.issueDate as string).split("T")[0],
          dueDate: po.dueDate ? (po.dueDate as string).split("T")[0] : "",
          taxRate: po.taxRate as number,
          notes: (po.notes as string) || "",
          terms: (po.terms as string) || "",
          status: po.status as string,
          lineItems,
        }}
      />
    </div>
  );
}
