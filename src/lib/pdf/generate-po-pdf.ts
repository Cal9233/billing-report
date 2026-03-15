import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface POPDFData {
  poNumber: string;
  status: string;
  issueDate: string | Date;
  expectedDate?: string | Date | null;
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

export function generatePOPDF(data: POPDFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(28);
  doc.setTextColor(16, 163, 74); // Green for POs
  doc.text("PURCHASE ORDER", 20, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`PO #: ${data.poNumber}`, 20, 42);
  doc.text(`Status: ${data.status.toUpperCase()}`, 20, 50);
  doc.text(`Issue Date: ${formatDate(data.issueDate)}`, 20, 58);
  if (data.expectedDate) {
    doc.text(`Expected Delivery: ${formatDate(data.expectedDate)}`, 20, 66);
  }

  // Company info (right side)
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Your Company Name", pageWidth - 20, 30, { align: "right" });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("123 Business Street", pageWidth - 20, 39, { align: "right" });
  doc.text("City, State 12345", pageWidth - 20, 47, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 74, pageWidth - 20, 74);

  // Vendor info
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("VENDOR:", 20, 84);
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(data.customer.name, 20, 93);

  let vendorY = 101;
  if (data.customer.email) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(data.customer.email, 20, vendorY);
    vendorY += 7;
  }
  if (data.customer.address) {
    doc.setFontSize(11);
    doc.text(data.customer.address, 20, vendorY);
    vendorY += 7;
  }
  const cityStateZip = [data.customer.city, data.customer.state, data.customer.zip]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) {
    doc.text(cityStateZip, 20, vendorY);
  }

  // Line items table
  const tableStartY = 120;
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
      fillColor: [16, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 12,
      cellPadding: 5,
    },
    bodyStyles: { fontSize: 11, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 38, halign: "right" },
      3: { cellWidth: 38, halign: "right" },
    },
    margin: { left: 20, right: 20 },
    theme: "striped",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 50;
  const totalsX = pageWidth - 80;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", totalsX, finalY + 18);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.subtotal), pageWidth - 20, finalY + 18, {
    align: "right",
  });

  if (data.taxRate > 0) {
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax (${data.taxRate}%):`, totalsX, finalY + 28);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(data.taxAmount), pageWidth - 20, finalY + 28, {
      align: "right",
    });
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, finalY + 34, pageWidth - 20, finalY + 34);

  doc.setFontSize(14);
  doc.setTextColor(16, 163, 74);
  doc.text("Total:", totalsX, finalY + 44);
  doc.text(formatCurrency(data.total), pageWidth - 20, finalY + 44, {
    align: "right",
  });

  // Notes & Terms
  let notesY = finalY + 62;
  if (data.notes) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text("Notes:", 20, notesY);
    doc.setTextColor(0, 0, 0);
    doc.text(data.notes, 20, notesY + 7, { maxWidth: pageWidth - 40 });
    notesY += 24;
  }
  if (data.terms) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text("Terms & Conditions:", 20, notesY);
    doc.setTextColor(0, 0, 0);
    doc.text(data.terms, 20, notesY + 7, { maxWidth: pageWidth - 40 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This purchase order is subject to the terms and conditions stated above.",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  return doc;
}
