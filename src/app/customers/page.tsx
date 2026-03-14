"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, X } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  _count: { invoices: number; purchaseOrders: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [saving, setSaving] = useState(false);

  const loadCustomers = () => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: "", email: "", phone: "", address: "", city: "", state: "", zip: "" });
        setShowForm(false);
        loadCustomers();
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customers and vendors</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Customer"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Customer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <Input value={formData.state} onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP</label>
                  <Input value={formData.zip} onChange={(e) => setFormData((p) => ({ ...p, zip: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No customers yet</p>
            <p className="text-muted-foreground mb-4">Add your first customer to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">{customer.name}</h3>
                {customer.email && (
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                )}
                {customer.phone && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
                {customer.address && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {customer.address}
                    {customer.city && `, ${customer.city}`}
                    {customer.state && `, ${customer.state}`}
                    {customer.zip && ` ${customer.zip}`}
                  </p>
                )}
                <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold">{customer._count.invoices}</p>
                    <p className="text-xs text-muted-foreground">Invoices</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{customer._count.purchaseOrders}</p>
                    <p className="text-xs text-muted-foreground">POs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
