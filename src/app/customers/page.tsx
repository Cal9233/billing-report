"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Users,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingCart,
  Trash2,
  Edit2,
} from "lucide-react";

interface Customer {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  contactName?: string | null;
  _count: { invoices: number; purchaseOrders: number };
}

const emptyForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loadCustomers = () => {
    setLoading(true);
    fetch("/api/customers")
      .then((res) => res.json())
      .then((res) => setCustomers(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      companyName: customer.companyName,
      contactName: customer.contactName ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zip: customer.zip ?? "",
      country: customer.country ?? "",
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setFormError("Company name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save customer");
      }
      closeForm();
      loadCustomers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (!confirm(`Delete customer "${companyName}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete customer:", error);
    }
  };

  const filtered = search
    ? customers.filter(
        (c) =>
          c.companyName.toLowerCase().includes(search.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.phone ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage your customers and vendors
          </p>
        </div>
        {!showForm && (
          <Button
            size="lg"
            onClick={openCreateForm}
            className="gap-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-primary/20 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? "Edit Customer" : "New Customer"}
            </h2>
            <button
              onClick={closeForm}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cust-name"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="cust-name"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, companyName: e.target.value }))
                  }
                  placeholder="e.g., ABC Tire Company"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="cust-contact"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Contact Name
                </label>
                <Input
                  id="cust-contact"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, contactName: e.target.value }))
                  }
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <label
                  htmlFor="cust-email"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Email Address
                </label>
                <Input
                  id="cust-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="cust-phone"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Phone Number
                </label>
                <Input
                  id="cust-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label
                  htmlFor="cust-address"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Street Address
                </label>
                <Input
                  id="cust-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label
                    htmlFor="cust-city"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    City
                  </label>
                  <Input
                    id="cust-city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, city: e.target.value }))
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cust-state"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    State
                  </label>
                  <Input
                    id="cust-state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, state: e.target.value }))
                    }
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cust-zip"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    ZIP
                  </label>
                  <Input
                    id="cust-zip"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, zip: e.target.value }))
                    }
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
              <div>
                <label
                  htmlFor="cust-country"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Country
                </label>
                <Input
                  id="cust-country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, country: e.target.value }))
                  }
                  placeholder="US"
                />
              </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} size="lg">
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Customer"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-11 rounded-lg border-2 border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          aria-label="Search customers"
        />
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border p-6 animate-pulse"
            >
              <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-48 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-36 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-cyan-600" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            {search ? "No matching customers" : "No customers yet"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {search
              ? "Try a different search term"
              : "Add your first customer to get started"}
          </p>
          {!search && (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="group bg-white rounded-xl border border-border p-5 hover:border-blue-200 hover:shadow-md transition-all duration-150"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {customer.companyName}
                  </h3>
                  {customer.contactName && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {customer.contactName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditForm(customer)}
                    aria-label={`Edit ${customer.companyName}`}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id, customer.companyName)}
                    aria-label={`Delete ${customer.companyName}`}
                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 mb-4">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {customer.address}
                      {customer.city && `, ${customer.city}`}
                      {customer.state && `, ${customer.state}`}
                      {customer.zip && ` ${customer.zip}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {customer._count.invoices}
                  </span>
                  <span>invoice{customer._count.invoices !== 1 ? "s" : ""}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {customer._count.purchaseOrders}
                  </span>
                  <span>PO{customer._count.purchaseOrders !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
