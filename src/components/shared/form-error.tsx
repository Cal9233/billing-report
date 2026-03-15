import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message?: string;
  errors?: Record<string, string>;
  className?: string;
}

export function FormError({
  message,
  errors,
  className = "",
}: FormErrorProps) {
  if (!message && (!errors || Object.keys(errors).length === 0)) {
    return null;
  }

  return (
    <div
      className={`p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 ${className}`}
    >
      {message && (
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">{message}</span>
        </div>
      )}
      {errors && Object.keys(errors).length > 0 && (
        <ul className="list-disc list-inside space-y-1 ml-2">
          {Object.entries(errors).map(([key, error]) => (
            <li key={key} className="text-sm">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
