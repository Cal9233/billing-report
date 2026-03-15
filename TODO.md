# BillFlow — Outstanding Issues & Tasks

## Status: App builds and runs, but needs cleanup

### Build: PASSING
- `next build` succeeds with zero errors
- Dev server runs fine on localhost

### Tests: BROKEN
- 2 test suites fail — tests import from `vitest` but project uses `jest`
- Files: `src/__tests__/utils.test.ts`, `src/__tests__/validation.test.ts`
- Fix: Either install vitest and configure it, or rewrite imports to use jest globals

### Uncommitted Changes (21 files)
All the UX redesign + font size work is uncommitted. Needs a commit:
- Sidebar, dashboard, all invoice pages, all PO pages
- Forms (invoice-form, po-form)
- UI components (badge, button, card, input)
- PDF generators (invoice, PO) — Dual Aero branding
- Global CSS, utils

### Functional Items to Verify
1. **Invoice create/edit flow** — Test the full flow: create invoice, add line items, save, view, edit, delete
2. **Purchase Order create/edit flow** — Same full flow test
3. **PDF generation** — Download PDF for an invoice and PO, verify "Dual Aero" branding shows
4. **Print** — Test browser print from invoice/PO detail pages
5. **Dashboard numbers** — Verify summary cards show correct totals from database
6. **Delete confirmation** — Verify confirmation dialog appears before deleting invoices/POs
7. **Empty states** — Delete all invoices, verify friendly "Create Your First Invoice" message appears
8. **Search/filter** — Test search box and status filter toggles on list pages

### Nice-to-Haves (Not Started)
- [ ] Add Dual Aero logo/icon to sidebar and PDFs
- [ ] Add customer management page (exists at /customers but may need simplicity pass)
- [ ] Add "Duplicate Invoice" button for repeat orders
- [ ] Add aging report (invoices overdue by 30/60/90 days)
- [ ] Mobile responsive testing — verify it works on a tablet
- [ ] Data backup/export functionality
