import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoicePDFData {
  invoiceNumber: string;
  status: string;
  issueDate: string | Date;
  dueDate: string | Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  customer: {
    name: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
}

export function generateInvoicePDF(data: InvoicePDFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(28);
  doc.setTextColor(26, 86, 219); // Primary blue
  doc.text("INVOICE", 20, 30);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice #: ${data.invoiceNumber}`, 20, 40);
  doc.text(`Status: ${data.status.toUpperCase()}`, 20, 46);
  doc.text(`Issue Date: ${formatDate(data.issueDate)}`, 20, 52);
  doc.text(`Due Date: ${formatDate(data.dueDate)}`, 20, 58);

  // Company info (right side)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Your Company Name", pageWidth - 20, 30, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("123 Business Street", pageWidth - 20, 37, { align: "right" });
  doc.text("City, State 12345", pageWidth - 20, 43, { align: "right" });
  doc.text("contact@company.com", pageWidth - 20, 49, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, pageWidth - 20, 65);

  // Bill To
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("BILL TO:", 20, 75);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(data.customer.name, 20, 82);

  let billToY = 88;
  if (data.customer.email) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(data.customer.email, 20, billToY);
    billToY += 5;
  }
  if (data.customer.address) {
    doc.setFontSize(9);
    doc.text(data.customer.address, 20, billToY);
    billToY += 5;
  }
  const cityStateZip = [data.customer.city, data.customer.state, data.customer.zip]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) {
    doc.text(cityStateZip, 20, billToY);
  }

  // Line items table
  const tableStartY = 105;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: data.lineItems.map((item) => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.amount),
    ]),
    headStyles: {
      fillColor: [26, 86, 219],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 20, right: 20 },
    theme: "striped",
  });

  // Totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 50;
  const totalsX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", totalsX, finalY + 15);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.subtotal), pageWidth - 20, finalY + 15, {
    align: "right",
  });

  if (data.taxRate > 0) {
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax (${data.taxRate}%):`, totalsX, finalY + 23);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(data.taxAmount), pageWidth - 20, finalY + 23, {
      align: "right",
    });
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, finalY + 28, pageWidth - 20, finalY + 28);

  doc.setFontSize(12);
  doc.setTextColor(26, 86, 219);
  doc.text("Total:", totalsX, finalY + 36);
  doc.text(formatCurrency(data.total), pageWidth - 20, finalY + 36, {
    align: "right",
  });

  // Notes & Terms
  let notesY = finalY + 55;
  if (data.notes) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Notes:", 20, notesY);
    doc.setTextColor(0, 0, 0);
    doc.text(data.notes, 20, notesY + 6, { maxWidth: pageWidth - 40 });
    notesY += 20;
  }

  if (data.terms) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Terms & Conditions:", 20, notesY);
    doc.setTextColor(0, 0, 0);
    doc.text(data.terms, 20, notesY + 6, { maxWidth: pageWidth - 40 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", pageWidth / 2, pageHeight - 15, {
    align: "center",
  });

  return doc;
}
