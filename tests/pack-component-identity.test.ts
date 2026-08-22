import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import { componentLogicalKey, normalizeComponents } from "../lib/pack-component-identity.js";

describe('pack component identity', ()=>{
  it('treats same product + same variation as same key', ()=>{
    const a = {product_id:'p1',variation_id:'v1'};
    const b = {product_id:'p1',variation_id:'v1'};
    expect(componentLogicalKey(a)).toEqual(componentLogicalKey(b));
  });
  it('treats same product + different variation as different', ()=>{
    const a = {product_id:'p1',variation_id:'v1'};
    const b = {product_id:'p1',variation_id:'v2'};
    expect(componentLogicalKey(a)).not.toEqual(componentLogicalKey(b));
  });
  it('uses stable sentinel for null variation', ()=>{
    const a = {product_id:'p1',variation_id:null};
    const b = {product_id:'p1'};
    expect(componentLogicalKey(a)).toEqual(componentLogicalKey(b));
  });
  it('normalizeComponents removes exact duplicates but reports conflicts', ()=>{
    const rows = [
      {product_id:'p1', variation_id:null, quantity:1, is_required:true, display_order:0},
      {product_id:'p1', variation_id:null, quantity:1, is_required:true, display_order:0},
      {product_id:'p1', variation_id:null, quantity:2, is_required:true, display_order:0},
      {product_id:'p2', variation_id:'v1', quantity:1, is_required:true, display_order:1},
    ];
    const {normalized,conflicts} = normalizeComponents(rows as any);
    expect(normalized.length).toBe(2);
    expect(conflicts.length).toBe(1);
  });
  it('normalization is idempotent', ()=>{
    const rows = [
      {product_id:'pA',variation_id:'x',quantity:1,is_required:true,display_order:0},
      {product_id:'pA',variation_id:'x',quantity:1,is_required:true,display_order:0}
    ];
    const first = normalizeComponents(rows as any).normalized;
    const second = normalizeComponents(first as any).normalized;
    expect(first).toEqual(second);
  });
  it('migration enforces transactional, safe, and admin-only behavior', ()=>{
    const sql = readFileSync(new URL('../supabase/migrations/20260820000000_replace_student_pack_components.sql', import.meta.url), 'utf8');
    expect(sql).toContain('security definer');
    expect(sql.match(/set search_path = ''/g)).toHaveLength(2);
    expect(sql).toContain('auth.uid() is null');
    expect(sql).toContain('private.is_admin()');
    expect(sql).toContain('revoke all on function public.replace_student_pack_components(uuid, jsonb) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.replace_student_pack_components(uuid, jsonb) to authenticated;');
    expect(sql).toContain('delete from public.student_pack_components where pack_id = v_pack;');
    expect(sql).toContain('Duplicate logical component identity for pack');
    expect(sql).toContain('create or replace function public.save_student_pack');
    expect(sql).toContain('perform public.replace_student_pack_components(v_id, v_components);');
    expect(sql).toContain('revoke all on function public.save_student_pack(uuid, jsonb, jsonb) from public, anon, authenticated;');
  });
  it('save path has no silent delete+insert fallback for RPC failures', ()=>{
    const source = readFileSync(new URL('../components/admin/student-pack-form.tsx', import.meta.url), 'utf8');
    expect(source).toContain('const rpcRes = await db.rpc("save_student_pack"');
    expect(source).not.toContain('.from("student_packs").update(payload)');
    expect(source).not.toContain('.from("student_packs").insert(payload)');
    expect(source).not.toContain('student_pack_components").delete().eq("pack_id",id)');
  });
});
