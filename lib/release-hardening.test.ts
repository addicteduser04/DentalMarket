import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const auth=readFileSync("components/account/auth-form.tsx","utf8");
const cart=readFileSync("components/storefront/add-to-cart.tsx","utf8");
const data=readFileSync("lib/data.ts","utf8");
const productPolicy=readFileSync("supabase/migrations/20260727160000_product_profiles.sql","utf8");

describe("final release hardening",()=>{
  it("does not expose raw authentication provider errors",()=>{
    expect(auth).not.toContain("result.error.message");
    expect(auth).toContain("E-mail ou mot de passe incorrect.");
  });
  it("blocks unavailable products and variations from the public cart",()=>{
    expect(cart).toContain('"unavailable"');
    expect(cart).toContain("variationUnavailable");
    expect(cart).toContain("activeVariations");
    expect(cart).toContain("disabled={unavailable}");
  });
  it("keeps public catalogue access behind publication visibility RLS",()=>{
    expect(data).toContain('.eq("is_active",true)');
    expect(productPolicy).toContain("publication_status = 'published'");
    expect(productPolicy).toContain("catalog_visible = true");
  });
});
