# Billing Report Software (BillFlow)

## Project Overview
Full-stack billing management application for invoices and purchase orders with PDF generation, print support, and analytics dashboard.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite via Prisma ORM
- **UI**: Tailwind CSS 4, shadcn/ui-style components, Radix UI primitives
- **Charts**: Recharts
- **PDF**: jsPDF + jspdf-autotable
- **Validation**: Zod

## Project Structure
```
src/
  app/              # Next.js App Router pages and API routes
    api/            # REST API (invoices, purchase-orders, customers, reports)
    dashboard/      # Analytics dashboard
    invoices/       # Invoice CRUD pages
    purchase-orders/# PO CRUD pages
    customers/      # Customer management
  components/
    ui/             # Reusable UI components (Button, Card, Input, Badge)
    forms/          # Invoice and PO form components
    layout/         # Sidebar navigation
  lib/
    db/             # Prisma client singleton
    pdf/            # PDF generation (invoice, PO)
    utils/          # Utilities (formatting, calculations)
  types/            # Shared TypeScript types and Zod schemas
prisma/
  schema.prisma     # Database schema
  seed.ts           # Sample data
```

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to database
- `npm run db:seed` — Seed with sample data
- `npm run db:studio` — Open Prisma Studio

## Key Design Decisions
- SQLite for zero-config local persistence (no external DB required)
- Server-side PDF generation via jsPDF for consistent output
- Print support via CSS @media print rules
- Client-side form state management (no form library to keep it lightweight)
- All monetary calculations use Math.round for cent precision
