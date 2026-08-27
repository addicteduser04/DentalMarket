import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("storefront image delivery",()=>{
  const image=readFileSync("components/storefront/product-image.tsx","utf8");
  it("keeps direct delivery, lazy card defaults, and explicit eager priority",()=>{
    expect(image).toContain('variant="card"');
    expect(image).toContain('loading={priority?"eager":"lazy"}');
    expect(image).toContain("unoptimized");
  });
  it("uses detail variants only for full product and pack hero pages",()=>{
    expect(readFileSync("app/product/[slug]/page.tsx","utf8")).toContain('variant="detail" priority');
    expect(readFileSync("app/student-packs/[university]/[pack]/page.tsx","utf8")).toContain('variant="detail" priority');
    expect(readFileSync("components/storefront/product-card.tsx","utf8")).not.toContain("priority");
    expect(readFileSync("components/storefront/student-pack-card.tsx","utf8")).not.toContain("priority");
  });
  it("limits catalogue cards per rendered page",()=>expect(readFileSync("app/search/page.tsx","utf8")).toContain("const PAGE_SIZE=24"));
  it("does not request unregistered variants and cannot retry beyond the placeholder",()=>{
    expect(readFileSync("data/product-image-variants.json","utf8").trim()).toBe("{}");
    expect(image).toContain("Math.min(candidateIndex+1,candidates.length-1)");
  });
});
