"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { POForm } from "@/components/forms/po-form";
import { ArrowLeft } from "lucide-react";

export default function NewPOPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Purchase Order</h1>
          <p className="text-muted-foreground">Create a new purchase order</p>
        </div>
      </div>
      <POForm mode="create" />
    </div>
  );
}
