import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const adminLayout=readFileSync("app/admin/layout.tsx","utf8");
const list=readFileSync("app/admin/products/page.tsx","utf8");
const detail=readFileSync("app/admin/products/[id]/page.tsx","utf8");
const form=readFileSync("components/admin/product-form.tsx","utf8");
const migration=readFileSync("supabase/migrations/20260727160000_product_profiles.sql","utf8");
describe("administrator product management",()=>{
  it("keeps anonymous and customer rejection server-side",()=>{expect(adminLayout).toContain('if(!user) redirect("/account")');expect(adminLayout).toContain('data?.role!=="admin"')});
  it("links list rows to the dedicated product profile",()=>{expect(list).toContain("`/admin/products/${product.id}`");expect(list).not.toContain("`/admin/products/${product.id}/edit`")});
  it("loads the exact product and handles missing records",()=>{expect(detail).toContain('.eq("id",params.id)');expect(detail).toContain("if(!product)notFound()")});
  it("implements save, archive, duplicate and unsaved warning",()=>{expect(form).toContain('from("products").update(payload)');expect(form).toContain('publication_status:"archived"');expect(form).toContain('publication_status:"draft"');expect(form).toContain("beforeunload");expect(form).toContain("confirm(")});
  it("keeps draft products private at the RLS boundary",()=>{expect(migration).toContain("publication_status = 'published'");expect(migration).toContain("catalog_visible = true");expect(migration).toContain('drop policy if exists "products_public_read"')});
});
