import { cn } from "@/lib/utils";

type StatusType =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "submitted"
  | "approved"
  | "received";

const statusColors: Record<StatusType, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-800" },
  sent: { bg: "bg-blue-100", text: "text-blue-800" },
  paid: { bg: "bg-green-100", text: "text-green-800" },
  overdue: { bg: "bg-red-100", text: "text-red-800" },
  cancelled: { bg: "bg-gray-200", text: "text-gray-700" },
  submitted: { bg: "bg-blue-100", text: "text-blue-800" },
  approved: { bg: "bg-yellow-100", text: "text-yellow-800" },
  received: { bg: "bg-green-100", text: "text-green-800" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors.draft;

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium inline-block",
        colors.bg,
        colors.text,
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
