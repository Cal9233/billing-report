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

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  received: "bg-emerald-100 text-emerald-800",
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
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
