import { describe, expect, it } from "vitest";
import { resolveProductDisplayPrices } from "./storefront-pricing";
import type { Product } from "./types";
import type { Offer } from "./types";

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

  it("does not stack a table offer on an active product promotion", () => {
    const offer:Offer={id:"o1",name:"Offre",badge_text:null,discount_type:"percentage",discount_value:50,scope:"all",category_id:null,product_id:null,starts_at:"2026-01-01",ends_at:null,is_active:true};
    const result = resolveProductDisplayPrices(product({ promotional_price: 590 }), offer);
    expect(result.currentDisplayedPrice).toBe(590);
    expect(result.crossedOutPrice).toBe(650);
  });
});
