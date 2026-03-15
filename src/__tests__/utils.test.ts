import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  generateInvoiceNumber,
  generatePONumber,
  calculateLineItemAmount,
  calculateTotals,
  getStatusColor,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

describe("formatDate", () => {
  it("formats Date objects", () => {
    const date = new Date(2026, 2, 14); // March 14, 2026 local time
    const result = formatDate(date);
    expect(result).toContain("2026");
    expect(result).toContain("Mar");
    expect(result).toContain("14");
  });

  it("formats date strings", () => {
    const result = formatDate("2026-01-15T00:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("Jan");
  });
});

describe("generateInvoiceNumber", () => {
  it("generates INV- prefixed numbers", () => {
    const num = generateInvoiceNumber();
    expect(num).toMatch(/^INV-\d{6}-\d{6}$/);
  });

  it("generates unique numbers", () => {
    const nums = new Set(Array.from({ length: 100 }, () => generateInvoiceNumber()));
    // With 1000000 possible values, 100 samples should be unique
    expect(nums.size).toBeGreaterThan(90);
  });
});

describe("generatePONumber", () => {
  it("generates PO- prefixed numbers", () => {
    const num = generatePONumber();
    expect(num).toMatch(/^PO-\d{6}-\d{6}$/);
  });
});

describe("calculateLineItemAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineItemAmount(10, 25)).toBe(250);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateLineItemAmount(3, 9.99)).toBe(29.97);
  });

  it("handles fractional quantities", () => {
    expect(calculateLineItemAmount(1.5, 100)).toBe(150);
  });

  it("handles zero", () => {
    expect(calculateLineItemAmount(0, 100)).toBe(0);
  });
});

describe("calculateTotals", () => {
  it("calculates subtotal, tax, and total", () => {
    const items = [
      { quantity: 2, unitPrice: 100 },
      { quantity: 1, unitPrice: 50 },
    ];
    const result = calculateTotals(items, 10);
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(25);
    expect(result.total).toBe(275);
  });

  it("handles zero tax rate", () => {
    const items = [{ quantity: 1, unitPrice: 100 }];
    const result = calculateTotals(items, 0);
    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(100);
  });

  it("handles empty line items", () => {
    const result = calculateTotals([], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("rounds tax correctly", () => {
    const items = [{ quantity: 1, unitPrice: 33.33 }];
    const result = calculateTotals(items, 8.5);
    expect(result.taxAmount).toBe(2.83);
    expect(result.total).toBe(36.16);
  });
});

describe("getStatusColor", () => {
  it("returns correct color for paid", () => {
    expect(getStatusColor("paid")).toContain("green");
  });

  it("returns correct color for overdue", () => {
    expect(getStatusColor("overdue")).toContain("red");
  });

  it("returns correct color for draft", () => {
    expect(getStatusColor("draft")).toContain("gray");
  });

  it("returns default for unknown status", () => {
    expect(getStatusColor("unknown")).toContain("gray");
  });
});
