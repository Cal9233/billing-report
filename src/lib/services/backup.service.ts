import prisma from "@/lib/db/client";
import { stringify } from "csv-stringify/sync";

export interface ExportOptions {
  format: "csv" | "json";
  includeLineItems?: boolean;
}

export async function exportInvoices(
  options: ExportOptions = { format: "csv" }
): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    include: {
      customer: true,
      ...(options.includeLineItems ? { lineItems: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (options.format === "json") {
    return JSON.stringify(invoices, null, 2);
  }

  // CSV export
  const rows = invoices.map((inv) => ({
    "Invoice Number": inv.invoiceNumber,
    "Customer Name": inv.customer.companyName,
    "Customer Email": inv.customer.email || "",
    "Issue Date": inv.issueDate.toISOString().split("T")[0],
    "Due Date": inv.dueDate.toISOString().split("T")[0],
    "Subtotal": inv.subtotal.toFixed(2),
    "Tax Rate %": inv.taxRate.toFixed(2),
    "Tax Amount": inv.taxAmount.toFixed(2),
    "Total": inv.total.toFixed(2),
    "Status": inv.status,
    "Notes": inv.notes || "",
  }));

  return stringify(rows, { header: true }) as string;
}

export async function exportPurchaseOrders(
  options: ExportOptions = { format: "csv" }
): Promise<string> {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      customer: true,
      ...(options.includeLineItems ? { lineItems: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (options.format === "json") {
    return JSON.stringify(purchaseOrders, null, 2);
  }

  // CSV export
  const rows = purchaseOrders.map((po) => ({
    "PO Number": po.poNumber,
    "Vendor Name": po.customer.companyName,
    "Vendor Email": po.customer.email || "",
    "Issue Date": po.issueDate.toISOString().split("T")[0],
    "Due Date": po.dueDate
      ? po.dueDate.toISOString().split("T")[0]
      : "",
    "Subtotal": po.subtotal.toFixed(2),
    "Tax Rate %": po.taxRate.toFixed(2),
    "Tax Amount": po.taxAmount.toFixed(2),
    "Total": po.total.toFixed(2),
    "Status": po.status,
    "Notes": po.notes || "",
  }));

  return stringify(rows, { header: true }) as string;
}

export async function exportCustomers(
  options: ExportOptions = { format: "csv" }
): Promise<string> {
  const customers = await prisma.customer.findMany({
    orderBy: { companyName: "asc" },
  });

  if (options.format === "json") {
    return JSON.stringify(customers, null, 2);
  }

  // CSV export
  const rows = customers.map((cust) => ({
    "Customer Name": cust.companyName,
    "Email": cust.email || "",
    "Phone": cust.phone || "",
    "Address": cust.address || "",
    "City": cust.city || "",
    "State": cust.state || "",
    "Zip": cust.zip || "",
    "Country": cust.country,
  }));

  return stringify(rows, { header: true }) as string;
}

export async function createFullBackup(): Promise<string> {
  const [invoices, purchaseOrders, customers] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: true,
        lineItems: true,
      },
    }),
    prisma.purchaseOrder.findMany({
      include: {
        customer: true,
        lineItems: true,
      },
    }),
    prisma.customer.findMany(),
  ]);

  const backup = {
    exportDate: new Date().toISOString(),
    version: "1.0",
    data: {
      customers,
      invoices,
      purchaseOrders,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function restoreFromBackup(
  backupJson: string
): Promise<{ success: boolean; message: string; errors: string[] }> {
  const errors: string[] = [];

  try {
    const backup = JSON.parse(backupJson);

    if (!backup.data) {
      return {
        success: false,
        message: "Invalid backup format",
        errors: ["Missing data section in backup"],
      };
    }

    // Restore customers
    if (backup.data.customers && Array.isArray(backup.data.customers)) {
      for (const cust of backup.data.customers) {
        try {
          const existingCustomer = await prisma.customer.findFirst({
            where: { email: cust.email || undefined },
          });

          if (!existingCustomer) {
            // Only create if not exists (preserve existing data)
            const { createdAt, updatedAt, ...custData } = cust;
            await prisma.customer.create({
              data: custData,
            });
          }
        } catch (err) {
          errors.push(
            `Failed to restore customer "${cust.companyName}": ${String(err)}`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      message: `Backup restored with ${errors.length} errors`,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      message: "Failed to parse backup file",
      errors: [String(err)],
    };
  }
}
