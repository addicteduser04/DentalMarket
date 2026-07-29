import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
// @ts-expect-error Vitest resolves the adjacent plain ESM production importer.
import {buildPayload,parseSourcePage} from "./student-recommendations-import.mjs";
const migration=readFileSync("supabase/migrations/20260729220000_student_recommended_products.sql","utf8");

describe("student recommendation import",()=>{
  it("maps source university/year pages without inventing variations",()=>{
    const page=parseSourcePage("https://dentalmarket.ma/product-category/student-supplies/fmdc/fmdc_a2/",'<a href="https://dentalmarket.ma/product/cahier-tp/">Cahier</a>');
    expect(page).toMatchObject({universitySlug:"fmdc",academicYearCode:"year-2"});
    expect(page.products).toEqual(["https://dentalmarket.ma/product/cahier-tp/"]);
  });
  it("deduplicates repeated links and excludes fixed-pack products",()=>{
    const page=parseSourcePage("https://dentalmarket.ma/product-category/student-supplies/uir/uir_a1/",'<a href="https://dentalmarket.ma/product/item/">A</a><a href="https://dentalmarket.ma/product/item/">A</a><a href="https://dentalmarket.ma/product/pack-officiel/">Pack</a>');
    const {payload,review}=buildPayload([page],[
      {id:"p1",product_type:"simple",source_metadata:{source_url:"https://dentalmarket.ma/product/item/",source_product_id:"1"}},
      {id:"p2",product_type:"bundle",source_metadata:{source_url:"https://dentalmarket.ma/product/pack-officiel/",source_product_id:"2"}},
    ] as any);
    expect(payload.recommendations).toHaveLength(1);
    expect(payload.recommendations[0].variation_id).toBeNull();
    expect(review.excludedPacks).toHaveLength(1);
  });
  it("records unmatched products instead of inventing relationships",()=>{
    const page={url:"source",universitySlug:"fmdc",academicYearCode:"year-1",products:["missing"]};
    const {payload,review}=buildPayload([page],[]);
    expect(payload.recommendations).toHaveLength(0);
    expect(review.unmatched).toEqual([{sourceUrl:"source",sourceProductUrl:"missing"}]);
  });
  it("keeps recommendations public-read, admin-write, and variation-safe",()=>{
    expect(migration).toContain("student_recommended_products_public_read");
    expect(migration).toContain("publication_status = 'published'");
    expect(migration).toContain("student_recommended_products_admin_write");
    expect(migration).toContain("(select private.is_admin())");
    expect(migration).toContain("validate_student_recommendation_variation");
  });
  it("provides duplicate prevention, idempotence, and a scoped rollback",()=>{
    expect(migration).toContain("student_recommended_products_relationship unique");
    expect(migration).toContain("on conflict (import_source, import_key) do update");
    expect(migration).toContain("rollback_student_recommendation_import");
  });
});
