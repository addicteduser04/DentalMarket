import {describe,expect,it} from "vitest";
import {readFile} from "node:fs/promises";

describe("admin analytics handoff",()=>{
  it("keeps the protected admin analytics page and a clear Vercel link",async()=>{const page=await readFile("app/admin/analytics/page.tsx","utf8");expect(page).toContain("Vercel Analytics");expect(page).toContain('href="https://vercel.com/dashboard"')});
  it("uses safe external-link behavior",async()=>{const page=await readFile("app/admin/analytics/page.tsx","utf8");expect(page).toContain('target="_blank"');expect(page).toContain('rel="noopener noreferrer"')});
  it("renders the global Analytics component exactly once",async()=>{const files=await Promise.all(["app/layout.tsx","app/admin/analytics/page.tsx"].map(file=>readFile(file,"utf8")));expect(files.join("\n").match(/<Analytics\s*\/>/g)).toHaveLength(1)});
  it("does not add Analytics to the admin page",async()=>expect(await readFile("app/admin/analytics/page.tsx","utf8")).not.toContain("<Analytics"));
  it("keeps the admin navigation target",async()=>expect(await readFile("components/admin/admin-nav.tsx","utf8")).toContain('["/admin/analytics","Analytics"'));
  it("keeps Step 9 business metrics on the admin dashboard",async()=>{const page=await readFile("app/admin/analytics/page.tsx","utf8");expect(page).toContain('href="/admin"');expect(page).not.toMatch(/cart_submissions|estimated_total|campaign_slug/)});
  it("contains no tokens, credentials, or local Vercel project metadata",async()=>{const page=await readFile("app/admin/analytics/page.tsx","utf8");expect(page).not.toMatch(/projectId|orgId|team_[A-Za-z0-9]+|prj_[A-Za-z0-9]+|token|service[_-]?role/i)});
});
