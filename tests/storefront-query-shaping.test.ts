import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("storefront query shaping",()=>{
  const data=readFileSync("lib/data.ts","utf8");
  it("keeps listing queries free of heavy product detail payloads",()=>{
    const start=data.indexOf('const catalogueListingProductFields=');
    const end=data.indexOf('const productDetailFields=',start);
    const listing=data.slice(start,end);
    expect(listing).not.toContain("technical_specs");
    expect(listing).not.toContain("variations,is_active");
    expect(listing).not.toContain("description,technical_specs");
  });
  it("loads one product by slug for the product detail page",()=>{
    const page=readFileSync("app/product/[slug]/page.tsx","utf8");
    expect(page).toContain("getStorefrontProduct(slug)");
    expect(data).toContain('.eq("slug",slug)');
    expect(data).toContain(".maybeSingle()");
  });
  it("uses the lightweight listing path for search and category pages",()=>{
    expect(readFileSync("app/search/page.tsx","utf8")).toContain("getCatalogListing()");
    expect(readFileSync("app/category/[slug]/page.tsx","utf8")).toContain("getCatalogListing()");
  });
});
