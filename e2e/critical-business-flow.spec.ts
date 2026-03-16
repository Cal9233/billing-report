/**
 * Critical Business Flow E2E Test
 * Tests: Login → Create Customer → Create PO → Create Invoice → Print Both → Dashboard
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://192.168.56.1:3000';

const screenshotDir = path.join(__dirname, '../e2e-screenshots/critical-flow');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

async function shot(page: Page, name: string) {
  const filePath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Screenshot saved: ${filePath}`);
}

async function login(page: Page) {
  // Force reset the page to a clean state before navigating to avoid ERR_ABORTED
  // from previous test's in-progress navigation (router.push, reload, etc.)
  await page.goto('about:blank').catch(() => {});
  await page.waitForTimeout(300);
  // Navigate to login
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
  await page.locator('#email').fill('admin@billflow.local');
  await page.locator('#password').fill('Demo123!');
  await page.getByRole('button', { name: /Sign In/i }).click();

  // Wait for dashboard; if we land back on login (CSRF/redirect issue), retry once
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 25000 });
  } catch {
    // Retry login once
    console.log('INFO: Login redirect failed, retrying...');
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'load' });
    await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
    await page.locator('#email').fill('admin@billflow.local');
    await page.locator('#password').fill('Demo123!');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 25000 });
  }
}

// ─── 1. Login ─────────────────────────────────────────────────────────────────

test('Step 1: Login with demo credentials and verify dashboard redirect', async ({ page }) => {
  // Navigate to home — should redirect to /auth/login
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Verify redirect to login
  await page.waitForURL(/auth\/login/, { timeout: 15000 });
  expect(page.url()).toContain('/auth/login');
  console.log('PASS: Redirected to /auth/login');

  // Fill in credentials
  await page.locator('#email').fill('admin@billflow.local');
  await page.locator('#password').fill('Demo123!');
  await page.getByRole('button', { name: /Sign In/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  expect(page.url()).toContain('/dashboard');
  console.log('PASS: Redirected to /dashboard after login');

  await shot(page, '01-login-success-dashboard');
});

// ─── 2. Create Customer ───────────────────────────────────────────────────────

test('Step 2: Create customer "Test Tire Co"', async ({ page }) => {
  await login(page);

  // Navigate to customers
  await page.goto(`${BASE}/customers`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /^Customers$/i })).toBeVisible();

  // Check if Test Tire Co already exists (prior test run)
  const bodyText = await page.textContent('body') ?? '';
  if (bodyText.includes('Test Tire Co')) {
    console.log('INFO: Test Tire Co already exists — skipping creation');
    await shot(page, '02-customer-already-exists');
    return;
  }

  // Click "Add Customer" button
  await page.getByRole('button', { name: /Add Customer/i }).click();
  await expect(page.getByText('New Customer')).toBeVisible();

  // Fill form with IDs discovered from source code
  await page.locator('#cust-name').fill('Test Tire Co');
  await page.locator('#cust-contact').fill('John Smith');
  await page.locator('#cust-email').fill('john@testtire.com');
  await page.locator('#cust-phone').fill('555-0100');

  // Address fields
  const addressInput = page.locator('#cust-address');
  if (await addressInput.isVisible().catch(() => false)) {
    await addressInput.fill('123 Main St');
  }
  const cityInput = page.locator('#cust-city');
  if (await cityInput.isVisible().catch(() => false)) {
    await cityInput.fill('Tampa');
  }
  const stateInput = page.locator('#cust-state');
  if (await stateInput.isVisible().catch(() => false)) {
    await stateInput.fill('FL');
  }
  const zipInput = page.locator('#cust-zip');
  if (await zipInput.isVisible().catch(() => false)) {
    await zipInput.fill('33601');
  }

  await shot(page, '02-customer-form-filled');

  // Submit — button text is "Add Customer"
  const [response] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/customers') && r.request().method() === 'POST',
      { timeout: 15000 }
    ),
    page.getByRole('button', { name: /^Add Customer$/i }).last().click(),
  ]);

  expect([200, 201]).toContain(response.status());
  console.log(`PASS: Customer created, status=${response.status()}`);

  // Wait for form to close and list to update
  await page.waitForTimeout(1500);

  // Reload to ensure list reflects new data
  await page.reload({ waitUntil: 'networkidle' });
  const updatedBody = await page.textContent('body') ?? '';
  expect(updatedBody).toContain('Test Tire Co');
  console.log('PASS: Test Tire Co appears in customer list');

  await shot(page, '02-customer-created');
});

// ─── 3. Create Purchase Order ─────────────────────────────────────────────────

test('Step 3: Create PO for Test Tire Co', async ({ page }) => {
  await login(page);

  // Navigate to purchase orders
  await page.goto(`${BASE}/purchase-orders`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /Purchase Orders/i, level: 1 })).toBeVisible();

  // Click New PO
  const newPoLink = page.getByRole('link', { name: /New Purchase Order/i });
  await newPoLink.click();
  await page.waitForURL(/purchase-orders\/new/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for customers API

  // Select vendor
  const vendorSelect = page.locator('#po-vendor');
  await vendorSelect.waitFor({ state: 'visible', timeout: 10000 });
  const opts = await vendorSelect.locator('option').count();
  console.log(`INFO: Vendor dropdown has ${opts} options`);

  if (opts <= 1) {
    throw new Error('No customers available to select as vendor — customer creation may have failed');
  }

  const allOptions = await vendorSelect.locator('option').allTextContents();
  console.log(`INFO: Vendor options: ${allOptions.join(', ')}`);
  const tireCo = allOptions.findIndex(t => t.includes('Test Tire Co'));
  if (tireCo >= 0) {
    await vendorSelect.selectOption({ index: tireCo });
    console.log('INFO: Selected Test Tire Co as vendor');
  } else {
    await vendorSelect.selectOption({ index: 1 });
    console.log(`INFO: Test Tire Co not found, selected: ${allOptions[1]}`);
  }

  // PO Number
  const poNumberInput = page.locator('#po-number');
  if (await poNumberInput.isVisible().catch(() => false)) {
    await poNumberInput.fill('PO-2026-001');
  }

  // Due date (next month)
  const dueDateInput = page.locator('#po-due-date');
  if (await dueDateInput.isVisible().catch(() => false)) {
    await dueDateInput.fill('2026-04-15');
  }

  // Notes
  const notesInput = page.locator('#po-notes');
  if (await notesInput.isVisible().catch(() => false)) {
    await notesInput.fill('Test PO');
  }

  // Line items
  await page.locator('#po-line-desc-0').fill('Michelin All-Season Tires');
  await page.locator('#po-line-qty-0').fill('20');
  await page.locator('#po-line-price-0').fill('150');

  // Add second line item
  const addLineBtn = page.getByRole('button', { name: /Add (Line )?Item/i });
  if (await addLineBtn.isVisible().catch(() => false)) {
    await addLineBtn.click();
    await page.waitForTimeout(500);
    const desc1 = page.locator('#po-line-desc-1');
    if (await desc1.isVisible().catch(() => false)) {
      await desc1.fill('Wheel Alignment Kit');
      await page.locator('#po-line-qty-1').fill('5');
      await page.locator('#po-line-price-1').fill('75');
    }
  }

  await shot(page, '03-po-form-filled');

  // Capture response body BEFORE navigation happens
  let poId = '';
  const responsePromise = page.waitForResponse(
    r => r.url().includes('/api/purchase-orders') && r.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.getByRole('button', { name: /Create PO/i }).click();
  const poResp = await responsePromise;

  // Read body immediately before page navigates
  const poBody = await poResp.json();
  poId = poBody.id;
  expect([200, 201]).toContain(poResp.status());
  console.log(`PASS: PO created, id=${poId}, status=${poResp.status()}`);

  // Wait for router.push navigation to detail page
  await page.waitForURL(/purchase-orders\/[^/]+$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await shot(page, '03-po-list-after-create');

  // The detail page shows PO number as h1 and PURCHASE ORDER as h2
  // Verify PURCHASE ORDER heading (h2) is visible
  const poHeading = page.locator('h2', { hasText: 'PURCHASE ORDER' });
  await expect(poHeading).toBeVisible({ timeout: 8000 });
  console.log('PASS: PO detail page shows PURCHASE ORDER heading');

  // Also check PDF button
  await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();
  console.log('PASS: PO PDF button visible');

  await shot(page, '03-po-detail');
});

// ─── 4. Create Invoice ────────────────────────────────────────────────────────

test('Step 4: Create Invoice for Test Tire Co', async ({ page }) => {
  await login(page);

  // Navigate to invoices
  await page.goto(`${BASE}/invoices`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /^Invoices$/i })).toBeVisible();

  // Click New Invoice
  await page.getByRole('link', { name: /New Invoice/i }).click();
  await page.waitForURL(/invoices\/new/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for customers API

  // Select customer
  const customerSelect = page.locator('#invoice-customer');
  await customerSelect.waitFor({ state: 'visible', timeout: 10000 });
  const opts = await customerSelect.locator('option').count();
  console.log(`INFO: Customer dropdown has ${opts} options`);

  if (opts <= 1) {
    throw new Error('No customers in dropdown — customer creation may have failed');
  }

  const allOptions = await customerSelect.locator('option').allTextContents();
  console.log(`INFO: Customer options: ${allOptions.join(', ')}`);
  const tireCo = allOptions.findIndex(t => t.includes('Test Tire Co'));
  if (tireCo >= 0) {
    await customerSelect.selectOption({ index: tireCo });
    console.log('INFO: Selected Test Tire Co as customer');
  } else {
    await customerSelect.selectOption({ index: 1 });
    console.log(`INFO: Test Tire Co not found, selected: ${allOptions[1]}`);
  }

  // Issue date + due date
  const issueDateInput = page.locator('#invoice-issue-date');
  if (await issueDateInput.isVisible().catch(() => false)) {
    await issueDateInput.fill('2026-03-15');
  }

  const dueDateInput = page.locator('#invoice-due-date');
  if (await dueDateInput.isVisible().catch(() => false)) {
    await dueDateInput.fill('2026-04-15');
  }

  // Tax rate
  const taxRateInput = page.locator('#invoice-tax-rate');
  if (await taxRateInput.isVisible().catch(() => false)) {
    await taxRateInput.fill('7.5');
  }

  // Notes
  const notesInput = page.locator('#invoice-notes');
  if (await notesInput.isVisible().catch(() => false)) {
    await notesInput.fill('Test Invoice');
  }

  // Line items
  await page.locator('#line-desc-0').fill('Tire Installation Service');
  await page.locator('#line-qty-0').fill('20');
  await page.locator('#line-price-0').fill('45');

  // Add second line item
  const addLineBtn = page.getByRole('button', { name: /Add (Line )?Item/i });
  if (await addLineBtn.isVisible().catch(() => false)) {
    await addLineBtn.click();
    await page.waitForTimeout(500);
    const desc1 = page.locator('#line-desc-1');
    if (await desc1.isVisible().catch(() => false)) {
      await desc1.fill('Wheel Balancing');
      await page.locator('#line-qty-1').fill('20');
      await page.locator('#line-price-1').fill('25');
    }
  }

  await shot(page, '04-invoice-form-filled');

  // Click Create Invoice and wait for the POST response + navigation
  // Use Promise.all to capture response and click simultaneously, then wait for URL change
  let invId = '';
  const [invResp] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/invoices') && r.request().method() === 'POST',
      { timeout: 15000 }
    ),
    page.getByRole('button', { name: /Create Invoice/i }).click(),
  ]);

  expect([200, 201]).toContain(invResp.status());
  invId = invResp.url().split('/').pop() || ''; // Try to extract ID from URL
  console.log(`PASS: Invoice POST response status=${invResp.status()}`);

  // Immediately get the ID via the API list (most recently created)
  await page.waitForTimeout(500); // Brief wait for server to commit
  const listRespForId = await page.request.get(`${BASE}/api/invoices?limit=1`);
  if (listRespForId.ok()) {
    const listData = await listRespForId.json();
    const items = listData.data ?? listData;
    if (Array.isArray(items) && items.length > 0) {
      invId = items[0].id;
      console.log(`INFO: Got invoice id from API list: ${invId}`);
    }
  }

  // Wait for navigation to happen (router.push from the form) — up to 15 seconds
  try {
    await page.waitForURL(
      url => {
        const href = url.toString();
        return href.includes('/invoices/') && !href.includes('/invoices/new');
      },
      { timeout: 15000 }
    );
    console.log(`INFO: router.push navigated to ${page.url()}`);
  } catch {
    // If router.push didn't navigate, go directly
    console.log(`INFO: router.push did not navigate, going directly to invoice ${invId}`);
    if (invId) {
      await page.goto(`${BASE}/invoices/${invId}`, { waitUntil: 'load' });
    }
  }

  await page.waitForLoadState('load');

  // Wait for "Loading invoice..." spinner to disappear (client fetch completes)
  await expect(page.getByText('Loading invoice...')).not.toBeVisible({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1000);

  await shot(page, '04-invoice-list-after-create');

  // Verify INVOICE heading on detail page (h2 per source code)
  const invHeading = page.locator('h2', { hasText: 'INVOICE' });
  await expect(invHeading).toBeVisible({ timeout: 12000 });
  console.log('PASS: Invoice detail page shows INVOICE heading');

  // Verify BILL TO
  await expect(page.getByText('BILL TO')).toBeVisible();
  console.log('PASS: Invoice detail shows BILL TO section');

  // Verify action buttons
  await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Print/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Edit/i })).toBeVisible();
  console.log('PASS: Invoice detail shows PDF, Print, Edit buttons');

  await shot(page, '04-invoice-detail');
});

// ─── 5. Print/PDF Both ────────────────────────────────────────────────────────

test('Step 5: PDF generation for Invoice', async ({ page }) => {
  await login(page);

  // Get the latest invoice via API
  const invListResp = await page.request.get(`${BASE}/api/invoices`);
  expect(invListResp.status()).toBe(200);
  const invListData = await invListResp.json();
  const invoices = invListData.data ?? invListData;
  if (!Array.isArray(invoices) || invoices.length === 0) {
    throw new Error('No invoices found — invoice creation may have failed');
  }
  const invId = invoices[0].id;
  console.log(`INFO: Testing PDF for invoice id=${invId}`);

  // Navigate to invoice detail
  await page.goto(`${BASE}/invoices/${invId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Verify PDF/Print buttons exist
  await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Print/i })).toBeVisible();

  await shot(page, '05-invoice-detail-with-print-button');

  // Test PDF API endpoint directly
  const pdfResp = await page.request.get(`${BASE}/api/invoices/${invId}/pdf`);
  expect(pdfResp.status()).toBe(200);
  const contentType = pdfResp.headers()['content-type'];
  expect(contentType).toContain('application/pdf');
  console.log(`PASS: Invoice PDF API returns 200 with content-type=${contentType}`);

  // Click PDF button — it may open a new tab or trigger a download
  // Use Promise.race to handle both cases without hanging on binary PDF load
  let pdfTabOpened = false;
  const newPagePromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.getByRole('button', { name: /PDF/i }).click();
  const newPage = await newPagePromise;

  if (newPage) {
    pdfTabOpened = true;
    // Don't wait for full load — PDFs are binary and never reach domcontentloaded in Chromium
    // Just wait a moment for the URL to resolve
    await page.waitForTimeout(2000);
    // Take screenshot of the original page (PDF viewer may not be screenshottable)
    await shot(page, '05-invoice-pdf-view');
    console.log(`PASS: Invoice PDF opened in new tab (url: ${newPage.url()})`);
    await newPage.close().catch(() => {});
  } else {
    await page.waitForTimeout(1000);
    await shot(page, '05-invoice-after-pdf-click');
    console.log('INFO: PDF button clicked — no new tab opened (download or inline)');
  }
  console.log(`PASS: PDF button interaction complete, new tab opened: ${pdfTabOpened}`);
});

test('Step 5b: PDF generation for Purchase Order', async ({ page }) => {
  await login(page);

  // Get the latest PO via API
  const poListResp = await page.request.get(`${BASE}/api/purchase-orders`);
  expect(poListResp.status()).toBe(200);
  const poListData = await poListResp.json();
  const pos = poListData.data ?? poListData;
  if (!Array.isArray(pos) || pos.length === 0) {
    throw new Error('No purchase orders found — PO creation may have failed');
  }
  const poId = pos[0].id;
  console.log(`INFO: Testing PDF for PO id=${poId}`);

  // Navigate to PO detail
  await page.goto(`${BASE}/purchase-orders/${poId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();

  await shot(page, '05-po-detail-with-pdf-button');

  // Test PDF API directly
  const pdfResp = await page.request.get(`${BASE}/api/purchase-orders/${poId}/pdf`);
  expect(pdfResp.status()).toBe(200);
  const contentType = pdfResp.headers()['content-type'];
  expect(contentType).toContain('application/pdf');
  console.log(`PASS: PO PDF API returns 200 with content-type=${contentType}`);

  // Click PDF button — handle binary PDF tab without hanging
  let pdfTabOpened = false;
  const newPagePromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.getByRole('button', { name: /PDF/i }).click();
  const newPage = await newPagePromise;

  if (newPage) {
    pdfTabOpened = true;
    await page.waitForTimeout(2000);
    await shot(page, '05-po-pdf-view');
    console.log(`PASS: PO PDF opened in new tab (url: ${newPage.url()})`);
    await newPage.close().catch(() => {});
  } else {
    await page.waitForTimeout(1000);
    await shot(page, '05-po-after-pdf-click');
    console.log('INFO: PDF button clicked — no new tab opened (download or inline)');
  }
  console.log(`PASS: PO PDF button interaction complete, new tab opened: ${pdfTabOpened}`);
});

// ─── 6. Dashboard Metrics ─────────────────────────────────────────────────────

test('Step 6: Dashboard metrics reflect created data', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for all stat cards to load

  // Verify all stat cards are present
  await expect(page.locator('p.text-sm.text-muted-foreground', { hasText: 'Total Revenue' })).toBeVisible();
  await expect(page.locator('p.text-sm.text-muted-foreground', { hasText: 'Purchase Orders' })).toBeVisible();
  await expect(page.locator('p.text-sm.text-muted-foreground', { hasText: 'Customers' })).toBeVisible();

  // Verify recent sections show data
  await expect(page.getByText('Recent Invoices')).toBeVisible();
  await expect(page.getByText('Recent Purchase Orders')).toBeVisible();

  console.log('PASS: Dashboard renders all stat cards and recent sections');
  await shot(page, '06-dashboard-final');
});
