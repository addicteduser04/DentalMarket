import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration=readFileSync(resolve("supabase/migrations/20260727150000_account_center.sql"),"utf8");
const adminLayout=readFileSync(resolve("app/admin/layout.tsx"),"utf8");
const accountNav=readFileSync(resolve("components/account/account-nav.tsx"),"utf8");
const favoritesList=readFileSync(resolve("components/account/favorites-list.tsx"),"utf8");

describe("favorites database security",()=>{
  it("prevents duplicate favorites",()=>{
    expect(migration).toContain("primary key (user_id, product_id)");
  });
  it("scopes creation, reading and removal to auth.uid",()=>{
    expect(migration).toContain('create policy "favorites_select_own"');
    expect(migration).toContain('create policy "favorites_insert_own"');
    expect(migration).toContain('create policy "favorites_delete_own"');
    expect(migration.match(/user_id = \(select auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it("provides an explicit empty-favorites state and removal",()=>{
    expect(favoritesList).toContain("Aucun favori enregistré");
    expect(favoritesList).toContain('.from("favorites").delete()');
    expect(favoritesList).toContain("window.confirm");
  });
});

describe("administrator authorization",()=>{
  it("rejects anonymous and non-admin visitors on the server",()=>{
    expect(adminLayout).toContain('if(!user) redirect("/account")');
    expect(adminLayout).toContain('if(data?.role!=="admin") redirect("/")');
    expect(adminLayout).toContain('.select("role")');
  });
  it("renders the admin account item only from the trusted server prop",()=>{
    expect(accountNav).toContain("{isAdmin&&");
    expect(accountNav).toContain('href="/admin"');
  });
});

describe("responsive account navigation",()=>{
  it("has separate desktop and mobile navigation controls",()=>{
    expect(accountNav).toContain("hidden lg:block");
    expect(accountNav).toContain("lg:hidden");
    expect(accountNav).toContain("aria-expanded");
  });
});

describe("Casablanca database constraint",()=>{
  it("rejects unsupported delivery cities at the database boundary",()=>{
    expect(migration).toContain("check (city = 'Casablanca')");
    expect(migration).toContain("check (delivery_city = 'Casablanca')");
  });
});
