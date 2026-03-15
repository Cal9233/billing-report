import { cn } from "@/lib/utils";

// CSS classes defined in globals.css to prevent Tailwind purge
const statusCssClass: Record<string, string> = {
  draft: "badge-draft",
  sent: "badge-sent",
  paid: "badge-paid",
  overdue: "badge-overdue",
  cancelled: "badge-cancelled",
  submitted: "badge-submitted",
  approved: "badge-approved",
  received: "badge-received",
  pending: "badge-pending",
};

const statusLabel: Record<string, string> = {
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

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cssClass = statusCssClass[status] ?? "badge-draft";
  const label =
    statusLabel[status] ??
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        cssClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
