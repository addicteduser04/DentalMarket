import {describe,expect,it} from "vitest";
import {PRODUCT_IMAGE_PLACEHOLDER,productImageCandidates,productImageVariantUrl} from "./product-image-variants";

const original="https://example.supabase.co/storage/v1/object/public/product-images/catalogue/item.png";

describe("product image variants",()=>{
  it("selects immutable card and detail objects",()=>{
    expect(productImageVariantUrl(original,"card")).toBe(`${original}.dn-card.webp`);
    expect(productImageVariantUrl(original,"detail")).toBe(`${original}.dn-detail.webp`);
  });
  it("falls back from a variant to its original and then the placeholder",()=>{
    expect(productImageCandidates(original,"card",{"catalogue/item.png":["card"]})).toEqual([`${original}.dn-card.webp`,original,PRODUCT_IMAGE_PLACEHOLDER]);
  });
  it("prefers the original without a registered variant",()=>{
    expect(productImageCandidates(original,"card",{})).toEqual([original,PRODUCT_IMAGE_PLACEHOLDER]);
    expect(productImageCandidates(original,"detail",{"catalogue/item.png":["card"]})).toEqual([original,PRODUCT_IMAGE_PLACEHOLDER]);
  });
  it("does not invent variants for external, local, or missing images",()=>{
    expect(productImageCandidates("https://dentalmarket.ma/a.png","card")).toEqual(["https://dentalmarket.ma/a.png",PRODUCT_IMAGE_PLACEHOLDER]);
    expect(productImageCandidates(null,"detail")).toEqual([PRODUCT_IMAGE_PLACEHOLDER]);
  });
});
