/**
 * Migration Guide: Float → Integer Cents
 *
 * This document describes the migration path from floating-point currency values
 * to integer cents for all monetary fields.
 *
 * PHASE 1 (CURRENT): Preparation
 * - Currency utility functions created (currency.ts)
 * - Utilities include conversion, formatting, and calculation functions
 * - All new code should use these utilities
 *
 * PHASE 2: Database Schema Update
 * - Create migration to update all Float fields in Invoice, PurchaseOrder,
 *   LineItem, POLineItem, and Payment models
 * - Update Prisma schema to change Float → Int
 * - Run migration: npm run db:push
 * - This is a ONE-TIME operation that cannot be reversed without backup
 *
 * PHASE 3: Service Layer Updates
 * - Update all service files (invoice.service.ts, purchase-order.service.ts, etc.)
 * - Convert all monetary calculations to use currency utilities
 * - Ensure calculations are done in cents (integers) before storage
 *
 * PHASE 4: API Updates
 * - Update all API routes to accept/return cents
 * - Update validation schemas to reflect cent-based values
 * - Add input validation to ensure integers
 *
 * PHASE 5: Frontend Updates
 * - Update all forms to use currency utilities
 * - Update display formatters to use centsToDollars()
 * - Ensure user input is properly converted
 *
 * PHASE 6: Testing
 * - Update all test fixtures to use cent values
 * - Add currency conversion tests
 * - Run full test suite to ensure no regressions
 *
 * CRITICAL NOTES:
 * 1. Do NOT mix float and integer calculations
 * 2. Always store as integers, convert to float only for display
 * 3. Test edge cases: $0.01, $999,999.99, rounding behavior
 * 4. Back up database before migration
 * 5. Consider data recovery plan in case of issues
 *
 * Example Migration for Invoice Amount:
 * OLD: subtotal = 100.00 (float)
 * NEW: subtotal = 10000 (int, representing 100.00)
 *
 * Display: centsToDollars(10000) → 100.00
 * Calculation: calculateWithTax(10000, 10) → { subtotal: 10000, tax: 1000, total: 11000 }
 */
