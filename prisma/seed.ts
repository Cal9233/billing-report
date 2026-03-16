import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Read org config from env vars or use defaults
  const orgName = process.env.SEED_ORG_NAME || "Demo Organization";
  const orgSlug = process.env.SEED_ORG_SLUG || "demo-org";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@billflow.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Demo123!";

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
      address: "123 Business Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      country: "US",
      phone: "555-0000",
      email: `billing@${orgSlug}.com`,
      currency: "USD",
      locale: "en-US",
    },
  });

  // Create admin user assigned to org
  const hashedPassword = await hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Admin User",
      role: "admin",
      organizationId: org.id,
    },
  });

  // Create sample customers — all scoped to the org
  const customer1 = await prisma.customer.create({
    data: {
      companyName: "Acme Corporation",
      email: "billing@acme.com",
      phone: "555-0100",
      address: "100 Main Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      organizationId: org.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyName: "TechStart Solutions",
      email: "accounts@techstart.io",
      phone: "555-0200",
      address: "200 Innovation Dr",
      city: "Austin",
      state: "TX",
      zip: "73301",
      organizationId: org.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      companyName: "Global Industries Ltd",
      email: "procurement@globalind.com",
      phone: "555-0300",
      address: "300 Commerce Blvd",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      organizationId: org.id,
    },
  });

  // Create sample invoices — all scoped to the org
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
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Web Development Services", quantity: 40, unitPrice: 100, total: 4000 },
          { description: "UI/UX Design Consultation", quantity: 10, unitPrice: 100, total: 1000 },
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
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Cloud Infrastructure Setup", quantity: 1, unitPrice: 7500, total: 7500 },
          { description: "Monthly Maintenance (3 months)", quantity: 3, unitPrice: 1500, total: 4500 },
          { description: "SSL Certificate", quantity: 1, unitPrice: 500, total: 500 },
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
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Data Analysis Report", quantity: 1, unitPrice: 2000, total: 2000 },
          { description: "Follow-up Consultation", quantity: 4, unitPrice: 300, total: 1200 },
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
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "API Development", quantity: 50, unitPrice: 125, total: 6250 },
          { description: "Database Optimization", quantity: 10, unitPrice: 250, total: 2500 },
        ],
      },
    },
  });

  // Create sample purchase orders — all scoped to the org
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202603-0001",
      status: "approved",
      issueDate: new Date("2026-03-05"),
      dueDate: new Date("2026-03-20"),
      subtotal: 2400,
      taxRate: 8.5,
      taxAmount: 204,
      total: 2604,
      terms: "Net 15",
      customerId: customer2.id,
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Server Hardware - Dell R750", quantity: 2, unitPrice: 1200, total: 2400 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202603-0002",
      status: "submitted",
      issueDate: new Date("2026-03-12"),
      dueDate: new Date("2026-04-01"),
      subtotal: 6800,
      taxRate: 0,
      taxAmount: 0,
      total: 6800,
      customerId: customer3.id,
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Software Licenses - Annual", quantity: 20, unitPrice: 240, total: 4800 },
          { description: "Support Package", quantity: 1, unitPrice: 2000, total: 2000 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-202602-0003",
      status: "received",
      issueDate: new Date("2026-02-15"),
      dueDate: new Date("2026-03-01"),
      subtotal: 950,
      taxRate: 8.5,
      taxAmount: 80.75,
      total: 1030.75,
      customerId: customer1.id,
      organizationId: org.id,
      lineItems: {
        create: [
          { description: "Office Supplies Bulk Order", quantity: 1, unitPrice: 450, total: 450 },
          { description: "Printer Toner Cartridges", quantity: 5, unitPrice: 100, total: 500 },
        ],
      },
    },
  });

  console.log("Seed data created successfully!");
  console.log(`Organization: ${orgName} (${orgSlug})`);
  console.log(`Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
