import { describe, expect, it } from "vitest";
import { resolveProductDisplayPrices } from "./storefront-pricing";
import type { Product } from "./types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Produit",
    slug: "produit",
    description: null,
    price: 650,
    compare_at_price: null,
    category_id: "c1",
    images: [],
    stock_status: "in_stock",
    target_audience: "both",
    variations: [],
    is_active: true,
    is_featured: false,
    publication_status: "published",
    ...overrides,
  };
}

describe("resolveProductDisplayPrices", () => {
  it("uses the promotional price as the current price and the standard price as the crossed-out price when a valid promotion is active", () => {
    const result = resolveProductDisplayPrices(product({ promotional_price: 590 }));

    expect(result.currentDisplayedPrice).toBe(590);
    expect(result.crossedOutPrice).toBe(650);
    expect(result.showCrossedOutPrice).toBe(true);
  });

  it("hides the crossed-out price when there is no active discount", () => {
    const result = resolveProductDisplayPrices(product());

    expect(result.currentDisplayedPrice).toBe(650);
    expect(result.crossedOutPrice).toBeNull();
    expect(result.showCrossedOutPrice).toBe(false);
  });
});
