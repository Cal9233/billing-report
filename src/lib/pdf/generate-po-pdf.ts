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

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`PO #: ${data.poNumber}`, 20, 40);
  doc.text(`Status: ${data.status.toUpperCase()}`, 20, 46);
  doc.text(`Issue Date: ${formatDate(data.issueDate)}`, 20, 52);
  if (data.expectedDate) {
    doc.text(`Expected Delivery: ${formatDate(data.expectedDate)}`, 20, 58);
  }

  // Company info (right side)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Your Company Name", pageWidth - 20, 30, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("123 Business Street", pageWidth - 20, 37, { align: "right" });
  doc.text("City, State 12345", pageWidth - 20, 43, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, pageWidth - 20, 65);

  // Vendor info
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("VENDOR:", 20, 75);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(data.customer.name, 20, 82);

  let vendorY = 88;
  if (data.customer.email) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(data.customer.email, 20, vendorY);
    vendorY += 5;
  }
  if (data.customer.address) {
    doc.setFontSize(9);
    doc.text(data.customer.address, 20, vendorY);
    vendorY += 5;
  }
  const cityStateZip = [data.customer.city, data.customer.state, data.customer.zip]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) {
    doc.text(cityStateZip, 20, vendorY);
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
      fillColor: [16, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 20, right: 20 },
    theme: "striped",
  });

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
  doc.setTextColor(16, 163, 74);
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
  doc.text(
    "This purchase order is subject to the terms and conditions stated above.",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  return doc;
}
