import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      name: "Acme Corporation",
      email: "billing@acme.com",
      phone: "555-0100",
      address: "100 Main Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "TechStart Solutions",
      email: "accounts@techstart.io",
      phone: "555-0200",
      address: "200 Innovation Dr",
      city: "Austin",
      state: "TX",
      zip: "73301",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: "Global Industries Ltd",
      email: "procurement@globalind.com",
      phone: "555-0300",
      address: "300 Commerce Blvd",
      city: "Chicago",
      state: "IL",
      zip: "60601",
    },
  });

  // Create sample invoices
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0001",
      status: "paid",
      issueDate: new Date("2026-03-01"),
      dueDate: new Date("2026-03-31"),
      subtotal: 5000,
      taxRate: 8.5,
      taxAmount: 425,
      total: 5425,
      notes: "Thank you for your prompt payment.",
      terms: "Net 30",
      customerId: customer1.id,
      lineItems: {
        create: [
          { description: "Web Development Services", quantity: 40, unitPrice: 100, amount: 4000 },
          { description: "UI/UX Design Consultation", quantity: 10, unitPrice: 100, amount: 1000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0002",
      status: "sent",
      issueDate: new Date("2026-03-10"),
      dueDate: new Date("2026-04-09"),
      subtotal: 12500,
      taxRate: 8.5,
      taxAmount: 1062.5,
      total: 13562.5,
      terms: "Net 30",
      customerId: customer2.id,
      lineItems: {
        create: [
          { description: "Cloud Infrastructure Setup", quantity: 1, unitPrice: 7500, amount: 7500 },
          { description: "Monthly Maintenance (3 months)", quantity: 3, unitPrice: 1500, amount: 4500 },
          { description: "SSL Certificate", quantity: 1, unitPrice: 500, amount: 500 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202602-0003",
      status: "overdue",
      issueDate: new Date("2026-02-01"),
      dueDate: new Date("2026-03-03"),
      subtotal: 3200,
      taxRate: 0,
      taxAmount: 0,
      total: 3200,
      terms: "Net 30",
      customerId: customer3.id,
      lineItems: {
        create: [
          { description: "Data Analysis Report", quantity: 1, unitPrice: 2000, amount: 2000 },
          { description: "Follow-up Consultation", quantity: 4, unitPrice: 300, amount: 1200 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-202603-0004",
      status: "draft",
      issueDate: new Date("2026-03-14"),
      dueDate: new Date("2026-04-13"),
      subtotal: 8750,
      taxRate: 8.5,
      taxAmount: 743.75,
      total: 9493.75,
      customerId: customer1.id,
      lineItems: {
        create: [
          { description: "API Development", quantity: 50, unitPrice: 125, amount: 6250 },
          { description: "Database Optimization", quantity: 10, unitPrice: 250, amount: 2500 },
        ],
      },
    },
  });

  // Create sample purchase orders
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202603-0001",
      status: "approved",
      issueDate: new Date("2026-03-05"),
      expectedDate: new Date("2026-03-20"),
      subtotal: 2400,
      taxRate: 8.5,
      taxAmount: 204,
      total: 2604,
      terms: "Net 15",
      customerId: customer2.id,
      lineItems: {
        create: [
          { description: "Server Hardware - Dell R750", quantity: 2, unitPrice: 1200, amount: 2400 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202603-0002",
      status: "submitted",
      issueDate: new Date("2026-03-12"),
      expectedDate: new Date("2026-04-01"),
      subtotal: 6800,
      taxRate: 0,
      taxAmount: 0,
      total: 6800,
      customerId: customer3.id,
      lineItems: {
        create: [
          { description: "Software Licenses - Annual", quantity: 20, unitPrice: 240, amount: 4800 },
          { description: "Support Package", quantity: 1, unitPrice: 2000, amount: 2000 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202602-0003",
      status: "received",
      issueDate: new Date("2026-02-15"),
      expectedDate: new Date("2026-03-01"),
      subtotal: 950,
      taxRate: 8.5,
      taxAmount: 80.75,
      total: 1030.75,
      customerId: customer1.id,
      lineItems: {
        create: [
          { description: "Office Supplies Bulk Order", quantity: 1, unitPrice: 450, amount: 450 },
          { description: "Printer Toner Cartridges", quantity: 5, unitPrice: 100, amount: 500 },
        ],
      },
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
