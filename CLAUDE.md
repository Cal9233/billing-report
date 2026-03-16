# BillFlow — Multi-Tenant SaaS Billing Software

## Project Overview
- **Product**: BillFlow — multi-tenant SaaS billing and invoicing platform
- **Stack**: Next.js 15, TypeScript, Prisma ORM, SQLite (dev) / MySQL (prod), NextAuth v5, Tailwind CSS
- **Repository**: https://github.com/Cal9233/billing-report.git
- **Path**: `/mnt/c/Users/calvi/Projects/billing-report/`

## Architecture

### Frontend
- Next.js App Router with React client components
- DM Sans font, light theme only (no dark mode)
- Tailwind CSS with custom status badge classes: `badge-paid`, `badge-pending`, `badge-overdue`, `badge-draft`
- Recharts for dashboard charts
- jsPDF + jspdf-autotable for PDF generation (invoice + PO templates)

### Backend
- Next.js API routes with Prisma services layer
- All API routes protected by `protectAPI()` middleware (auth + rate limiting)
- All service functions take `organizationId` as first parameter
- `organizationId` always derived from JWT session, never from request params
- Admin-only routes: DELETE endpoints, backup/export, invite creation

### Database
- SQLite locally, MySQL for production
- Prisma schema at `prisma/schema.prisma`
- Key models: Organization (tenant), User, Customer, Invoice, PurchaseOrder, LineItem, POLineItem, Payment, Session, Invite

### Auth
- NextAuth v5 with credentials provider
- JWT sessions (24hr expiry)
- Role-based access: admin / user
- Invite-only registration (no open signup)
- Passwords: bcrypt cost 12
- Tokens (reset, invite): SHA-256 hashed in DB

### Multi-Tenancy
- Organization model acts as tenant boundary
- All database queries scoped by `organizationId` from JWT session
- PDF templates pull company info from Organization profile

### Security
- HMAC-signed CSRF tokens with 24hr expiry
- SHA-256 hashed reset/invite tokens
- bcrypt passwords (cost 12)
- HSTS, CSP headers
- IP-based rate limiting (100/15min web, 30/min API)
- In-memory rate limiters (use Redis for production)

## Directory Structure
```
src/
├── app/
│   ├── api/              # API routes (invoices, customers, POs, payments, auth, reports, backup, export)
│   ├── auth/             # Auth pages (login, change-password, forgot-password, reset-password, request-access)
│   ├── dashboard/        # Dashboard with metrics + chart
│   ├── invoices/         # Invoice list, detail, edit
│   ├── purchase-orders/  # PO list, detail, edit
│   ├── customers/        # Customer list with inline create/edit
│   └── payments/         # Payments list
├── components/
│   ├── auth/             # Logout button
│   ├── forms/            # Invoice form, PO form
│   ├── layout/           # Sidebar, AppShell
│   ├── payments/         # Payment section, payment form
│   └── shared/           # StatusBadge, DataTable, LoadingSpinner, FormError, EmptyState
├── lib/
│   ├── auth/             # NextAuth config
│   ├── middleware/        # CSRF, rate limiting, API protection
│   ├── pdf/              # Invoice + PO PDF generators (jsPDF)
│   ├── services/         # All business logic (invoice, customer, PO, payment, report, search, backup, overdue, email)
│   └── utils/            # formatCurrency, formatDate, number generators
└── types/                # Zod schemas, NextAuth type declarations
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Demo data seeder
```

## Development Commands
```bash
npx next dev              # Start dev server
npx vitest run            # Run 257 unit tests
npx tsc --noEmit          # TypeScript check
npx next build            # Production build
npx prisma generate       # Regenerate Prisma client
npx prisma db push        # Sync schema to DB
npx prisma db seed        # Seed demo data
npx playwright test e2e/  # E2E tests (requires server running)
```

## Environment Variables
See `.env.example` for full list:
- `DATABASE_URL` — SQLite path (dev) or MySQL connection string (prod)
- `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` — NextAuth config
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Email
- `ADMIN_NOTIFICATION_EMAIL` — Where admin alerts go
- `SEED_ORG_NAME`, `SEED_ORG_SLUG`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — Seeder config

## Testing
- **Unit**: 257 tests (vitest) across 9 test files
- **E2E**: Playwright specs in `e2e/` directory
- **Test credentials**: set via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars
- **E2E env vars**: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `PLAYWRIGHT_BASE_URL`

## Conventions
- All API routes use `protectAPI()` middleware for auth + rate limiting
- All service functions take `organizationId` as first parameter
- `organizationId` comes from JWT session, never from request params
- Admin-only routes: DELETE endpoints, backup/export, invite creation
- Frontend uses `window.location.href` for navigation after auth state changes (not `router.push`)
- Light theme only — no dark mode
- Status badges use CSS classes: `badge-paid`, `badge-pending`, `badge-overdue`, `badge-draft`
- PDF templates pull company info from Organization profile
- All monetary calculations use `Math.round` for cent precision

## Known Issues / Gotchas
- **WSL2**: `localhost` doesn't work for Playwright — use `192.168.56.1` (Windows host IP)
- **WSL2**: `rm -rf .next` may fail — use `cmd.exe /c "rmdir /s /q .next"` instead
- **Prisma generate** fails if dev server is running (DLL lock) — stop server first
- **next build** workspace warning: `outputFileTracingRoot` can silence it but not required
- **Rate limiters** are in-memory and reset on restart — use Redis for production
- **Float precision**: currency utility library exists (`float→cents`) with migration plan written but not yet executed
