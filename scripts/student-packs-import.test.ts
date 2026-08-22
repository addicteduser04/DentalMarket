import {describe,expect,it} from "vitest";
import {deriveAcademicYear,deriveSession} from "./student-packs-import.mjs";
import {readFileSync} from "node:fs";
const migration=readFileSync("supabase/migrations/20260729210000_student_packs.sql","utf8");
const rlsFix=readFileSync("supabase/migrations/20260729213000_fix_student_pack_public_rls.sql","utf8");
const importer=readFileSync("scripts/student-packs-import.mjs","utf8");
describe("student pack import and security",()=>{
 it("extracts only explicit year and session evidence",()=>{expect(deriveAcademicYear("Pack 2ème Année UM6SS-Rabat 2026")).toBe("year-2");expect(deriveSession("Pack 2025-2026")).toBe("2025–2026");expect(()=>deriveAcademicYear("Pack UM6SS")).toThrow()});
 it("uses stable identities and source product/variation matching",()=>{expect(importer).toContain("import_key:`source:${source.id}`");expect(importer).toContain("source_metadata.source_product_id");expect(importer).toContain("allowed_variations?.length === 1")});
 it("normalizes relationships without copying products",()=>{expect(migration).toContain("product_id uuid not null references public.products(id) on delete restrict");expect(migration).toContain("academic_year_id uuid not null references public.academic_years(id) on delete restrict");expect(migration).toContain("unique (pack_id, source_bundle_item_id)")});
 it("keeps drafts private and writes admin-only",()=>{expect(migration).toContain("publication_status = 'published'");expect(migration).toContain("student_packs_admin_write");expect(migration).toContain("(select private.is_admin())");expect(migration).toContain("grant execute on function public.import_dentanova_student_packs(jsonb) to service_role")});
 it("keeps anonymous reads independent of the private admin helper",()=>{expect(rlsFix).toContain("using (is_active)");expect(rlsFix).toContain("student_packs_admin_read_all");expect(rlsFix).toContain("publication_status = 'published'")});
 it("validates exact variations against their assigned product",()=>{expect(migration).toContain("validate_pack_component_variation");expect(migration).toContain("Pack variation does not belong to product")});
 it("provides an idempotent import identity and rollback",()=>{expect(migration).toContain("student_packs_import_identity unique");expect(migration).toContain("rollback_dentanova_student_pack_import")});
});
