import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf-8");

/**
 * Extract a model block from the Prisma schema by name.
 */
function getModelBlock(modelName: string): string {
  const regex = new RegExp(
    `model\\s+${modelName}\\s*\\{([^}]+)\\}`,
    "s"
  );
  const match = schema.match(regex);
  if (!match) throw new Error(`Model ${modelName} not found in schema`);
  return match[1];
}

describe("Customer relation - onDelete: Restrict", () => {
  it("Invoice has onDelete: Restrict on customer relation", () => {
    const block = getModelBlock("Invoice");
    const customerLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("customerId"));

    expect(customerLine).toBeDefined();
    expect(customerLine).toContain("onDelete: Restrict");
  });

  it("PurchaseOrder has onDelete: Restrict on customer relation", () => {
    const block = getModelBlock("PurchaseOrder");
    const customerLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("customerId"));

    expect(customerLine).toBeDefined();
    expect(customerLine).toContain("onDelete: Restrict");
  });

  it("Invoice customer relation does NOT use Cascade", () => {
    const block = getModelBlock("Invoice");
    const customerLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("customerId"));

    expect(customerLine).not.toContain("onDelete: Cascade");
  });

  it("PurchaseOrder customer relation does NOT use Cascade", () => {
    const block = getModelBlock("PurchaseOrder");
    const customerLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("customerId"));

    expect(customerLine).not.toContain("onDelete: Cascade");
  });
});

describe("LineItem relations - onDelete: Cascade", () => {
  it("LineItem has onDelete: Cascade on invoice relation", () => {
    const block = getModelBlock("LineItem");
    const relationLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("invoiceId"));

    expect(relationLine).toBeDefined();
    expect(relationLine).toContain("onDelete: Cascade");
  });

  it("POLineItem has onDelete: Cascade on purchaseOrder relation", () => {
    const block = getModelBlock("POLineItem");
    const relationLine = block
      .split("\n")
      .find(
        (line) =>
          line.includes("@relation") && line.includes("purchaseOrderId")
      );

    expect(relationLine).toBeDefined();
    expect(relationLine).toContain("onDelete: Cascade");
  });

  it("LineItem does NOT use Restrict", () => {
    const block = getModelBlock("LineItem");
    const relationLine = block
      .split("\n")
      .find((line) => line.includes("@relation") && line.includes("invoiceId"));

    expect(relationLine).not.toContain("onDelete: Restrict");
  });

  it("POLineItem does NOT use Restrict", () => {
    const block = getModelBlock("POLineItem");
    const relationLine = block
      .split("\n")
      .find(
        (line) =>
          line.includes("@relation") && line.includes("purchaseOrderId")
      );

    expect(relationLine).not.toContain("onDelete: Restrict");
  });
});

describe("Schema model existence", () => {
  it("contains all expected models", () => {
    const expectedModels = [
      "Customer",
      "Invoice",
      "PurchaseOrder",
      "LineItem",
      "POLineItem",
    ];
    for (const model of expectedModels) {
      expect(schema).toContain(`model ${model}`);
    }
  });
});
