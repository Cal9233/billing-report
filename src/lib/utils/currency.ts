/**
 * Currency utilities for handling monetary values as integers (cents)
 * This prevents floating-point precision errors in financial calculations
 */

/**
 * Convert dollars to cents (integer)
 * @param dollars Float value in dollars
 * @returns Integer value in cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (float)
 * @param cents Integer value in cents
 * @returns Float value in dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as currency string
 * @param cents Integer value in cents
 * @param currency Currency symbol (default: $)
 * @returns Formatted string (e.g., "$123.45")
 */
export function formatCurrency(cents: number, currency = "$"): string {
  const dollars = centsToDollars(cents);
  return `${currency}${dollars.toFixed(2)}`;
}

/**
 * Parse currency string to cents
 * @param value Currency string (e.g., "$123.45", "123.45", "123")
 * @returns Integer value in cents
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === "number") {
    return dollarsToCents(value);
  }

  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[$\s,]/g, "").trim();
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    throw new Error(`Invalid currency value: ${value}`);
  }

  return dollarsToCents(parsed);
}

/**
 * Add amounts in cents
 * @param amounts Array of amounts in cents
 * @returns Sum in cents
 */
export function sumCents(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate percentage of amount
 * @param amount Amount in cents
 * @param percentage Percentage value (0-100)
 * @returns Calculated amount in cents
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return Math.round((amount * percentage) / 100);
}

/**
 * Apply tax to amount
 * @param amount Amount in cents (before tax)
 * @param taxRate Tax rate as percentage (0-100)
 * @returns Object with subtotal, tax, and total in cents
 */
export function calculateWithTax(
  amount: number,
  taxRate: number
): { subtotal: number; tax: number; total: number } {
  const subtotal = amount;
  const tax = calculatePercentage(amount, taxRate);
  const total = subtotal + tax;

  return { subtotal, tax, total };
}

/**
 * Calculate line item total
 * @param quantity Number of items
 * @param unitPrice Unit price in cents
 * @returns Total in cents
 */
export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}
