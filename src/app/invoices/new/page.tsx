"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { ArrowLeft } from "lucide-react";

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Invoice</h1>
          <p className="text-muted-foreground">Create a new invoice</p>
        </div>
      </div>
      <InvoiceForm mode="create" />
    </div>
  );
}
