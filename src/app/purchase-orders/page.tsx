"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  issueDate: string;
  expectedDate: string | null;
  total: number;
  customer: { id: string; name: string; email: string | null };
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const url = filter
      ? `/api/purchase-orders?status=${filter}`
      : "/api/purchase-orders";
    fetch(url)
      .then((res) => res.json())
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return;
    try {
      await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((po) => po.id !== id));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const statuses = ["", "draft", "submitted", "approved", "received", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      </div>

      <div role="group" aria-label="Filter purchase orders by status" className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            aria-pressed={filter === s}
            aria-label={`Filter by ${s || "all"} status`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading ? "Loading purchase orders..." : `${orders.length} purchase order${orders.length !== 1 ? "s" : ""} shown`}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground" aria-hidden="true">Loading...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No purchase orders found</p>
            <p className="text-muted-foreground mb-4">Create your first PO</p>
            <Link href="/purchase-orders/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Purchase Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {orders.length} Purchase Order{orders.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PO #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Issue Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expected</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Link href={`/purchase-orders/${po.id}`} className="font-medium text-primary hover:underline">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm">{po.customer.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(po.issueDate)}</td>
                      <td className="py-3 px-4 text-sm">
                        {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatCurrency(po.total)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          <Link href={`/purchase-orders/${po.id}/edit`}>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(po.id)} aria-label={`Delete purchase order ${po.poNumber}`} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
