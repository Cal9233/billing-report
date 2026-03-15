export const INVOICE_STATUSES = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

export const PO_STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;

// Tailwind-safe inline classes for pages that use getStatusColor() directly
export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border border-gray-200",
  sent: "bg-blue-50 text-blue-700 border border-blue-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
  overdue: "bg-red-50 text-red-700 border border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
  submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  approved: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  received: "bg-green-50 text-green-700 border border-green-200",
  pending: "bg-blue-50 text-blue-700 border border-blue-200",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  submitted: "Submitted",
  approved: "Approved",
  received: "Received",
  pending: "Pending",
};

export function getStatusColor(status: string): string {
  return (
    STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border border-gray-200"
  );
}

export function getStatusLabel(status: string): string {
  return (
    STATUS_LABELS[status] ??
    status.charAt(0).toUpperCase() + status.slice(1)
  );
}
