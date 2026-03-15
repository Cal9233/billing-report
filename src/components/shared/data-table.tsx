import { ReactNode } from "react";

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isEmpty || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left font-medium text-muted-foreground"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[rowKey])}
              onClick={() => onRowClick?.(row)}
              className="border-b border-border hover:bg-accent transition-colors cursor-pointer"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-4 py-3"
                  style={{ width: col.width }}
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
