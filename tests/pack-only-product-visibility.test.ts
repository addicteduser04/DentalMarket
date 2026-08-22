import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync("supabase/migrations/20260822000000_public_student_pack_products.sql","utf8");
const followup=readFileSync("supabase/migrations/20260823000000_finalize_predeployment_schema.sql","utf8");
const loader=readFileSync("lib/student-pack-data.ts","utf8");
const packPage=readFileSync("app/student-packs/[university]/[pack]/page.tsx","utf8");
const productPolicy=readFileSync("supabase/migrations/20260727160000_product_profiles.sql","utf8");

describe("pack-only product visibility",()=>{
  it("keeps normal catalogue reads restricted to catalogue-visible products",()=>{
    expect(productPolicy).toContain("catalog_visible = true");
    expect(migration).not.toContain("drop policy");
    expect(migration).not.toContain("create policy");
  });

  it("only resolves active published products linked to a public pack",()=>{
    expect(migration).toContain("component.pack_id = pack.id");
    expect(migration).toContain("product.id = component.product_id");
    expect(migration).toContain("product.is_active = true");
    expect(migration).toContain("product.publication_status = 'published'");
    expect(migration).toContain("pack.publication_status = 'published'");
    expect(migration).toContain("university.is_active = true");
  });

  it("does not expose arbitrary hidden products or privileged fields",()=>{
    expect(migration).toContain("where pack.slug = v_pack_slug");
    expect(migration).not.toContain("source_metadata");
    expect(migration).not.toContain("internal_stock_note");
    expect(migration).not.toContain("updated_by");
    expect(migration).toContain("revoke all");
    expect(migration).toContain("to anon, authenticated");
  });

  it("uses the scoped RPC only for public pack detail resolution",()=>{
    expect(loader).toContain('db.rpc("get_public_student_pack_products",{v_pack_slug:slug})');
    expect(loader).toContain("productByComponent.get(component.id)||component.products");
  });

  it("returns catalogue visibility only to suppress inaccessible pack-only links",()=>{
    expect(followup).toContain("'catalog_visible', product.catalog_visible");
    expect(followup).toContain("where pack.slug = v_pack_slug");
    expect(followup).toContain("revoke all on function public.get_public_student_pack_products(text) from public;");
    expect(packPage).toContain("product?.catalog_visible===false");
  });
});
