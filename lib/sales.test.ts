import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {calculateSaleTotals,validateSale,type SaleItemDraft} from "./sales";

const migration=readFileSync("supabase/migrations/20260727170000_manual_whatsapp_sales.sql","utf8");
const hardeningMigration=readFileSync("supabase/migrations/20260727171000_sale_global_discount_and_final_cancellation.sql","utf8");
const list=readFileSync("app/admin/sales/page.tsx","utf8");
const form=readFileSync("components/admin/sale-form.tsx","utf8");
const detail=readFileSync("app/admin/sales/[saleId]/page.tsx","utf8");
const printButton=readFileSync("components/admin/print-receipt-button.tsx","utf8");
const layout=readFileSync("app/admin/layout.tsx","utf8");

const line=(patch:Partial<SaleItemDraft>={}):SaleItemDraft=>({
  key:"one",product_id:"product-1",variation_id:"",product_name:"Instrument",
  quantity:1,unit_price:100,discount_amount:0,is_custom:false,...patch,
});

describe("manual WhatsApp sale calculations",()=>{
  it("calculates multiple products, discounts, delivery, payment and balance in MAD",()=>{
    expect(calculateSaleTotals([
      line({quantity:2,unit_price:125.5,discount_amount:11}),
      line({key:"two",quantity:3,unit_price:50,discount_amount:9}),
    ],25,200)).toEqual({subtotal:401,discount:20,delivery:25,total:406,paid:200,balance:206});
  });
  it("validates partial payment and custom lines",()=>{
    const result=validateSale([line({product_id:"",product_name:"Article spécial",is_custom:true})],{
      customer_name:"Cabinet Atlas",customer_phone:"+212 659 547 879",
      delivery_address:"12 rue Exemple",neighbourhood:"Maarif",
      delivery_charge:20,amount_paid:50,payment_status:"partially_paid",
    });
    expect(result.valid).toBe(true);expect(result.totals.balance).toBe(70);
  });
  it("applies a sale-level discount in addition to line discounts",()=>{
    expect(calculateSaleTotals([line({quantity:2,unit_price:100,discount_amount:10})],20,50,25))
      .toEqual({subtotal:200,discount:35,delivery:20,total:185,paid:50,balance:135});
  });
  it("rejects invalid quantities, excessive discounts and overpayment",()=>{
    const result=validateSale([line({quantity:0,discount_amount:200})],{
      customer_name:"A",customer_phone:"123",delivery_address:"x",neighbourhood:"",
      delivery_charge:0,amount_paid:500,payment_status:"paid",
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(["customer_name","customer_phone","delivery_address","neighbourhood","item_0","amount_paid"]));
  });
});

describe("manual sales database security and inventory",()=>{
  it("enforces administrator access in layout, RLS and the transactional RPC",()=>{
    expect(layout).toContain('data?.role!=="admin"');
    expect(migration).toContain("not (select private.is_admin())");
    expect(migration).toContain('create policy "sales_admin_select"');
    expect(migration).toContain('create policy "sale_items_admin_select"');
    expect(migration).toContain("revoke all on public.sales from anon, authenticated");
    expect(migration).toContain("revoke all on function public.save_manual_sale");
  });
  it("creates normalized sales with multiple items and immutable commercial history",()=>{
    expect(migration).toContain("create table if not exists public.sales");
    expect(migration).toContain("create table if not exists public.sale_items");
    expect(migration).toContain("delete from public.sale_items where sale_id = target_id");
    expect(migration).toContain("on delete restrict");
    expect(migration).not.toMatch(/delete policy|sales_admin_delete/i);
  });
  it("deducts only confirmed catalogue and variation inventory without going negative",()=>{
    expect(migration).toContain("if requested_status = 'confirmed'");
    expect(migration).toContain("perform private.apply_sale_inventory(target_id, -1)");
    expect(migration).toContain("where sale_id = p_sale_id and not is_custom");
    expect(migration).toContain("Insufficient product stock");
    expect(migration).toContain("Insufficient variation stock");
    expect(migration).toContain("jsonb_set(");
  });
  it("does not deduct drafts, restores cancellations, and prevents repeated deductions",()=>{
    expect(migration).toContain("if was_applied then");
    expect(migration).toContain("perform private.apply_sale_inventory(target_id, 1)");
    expect(migration).toContain("inventory_applied = false");
    expect(migration).toContain("inventory_applied = true");
    expect(migration).not.toContain("requested_status = 'draft' then");
    expect(hardeningMigration).toContain("A cancelled sale cannot be reopened");
    expect(hardeningMigration).toContain("save_manual_sale_v2");
    expect(hardeningMigration).toContain("revoke all on function public.save_manual_sale(uuid, jsonb, jsonb) from authenticated");
  });
});

describe("manual sales administrator experience",()=>{
  it("provides customer, product, date and workflow filters",()=>{
    for(const field of ['name="q"','name="from"','name="to"','name="product"','name="payment"','name="delivery"','name="status"'])expect(list).toContain(field);
  });
  it("supports variations, multiple products, custom lines and safe errors",()=>{
    expect(form).toContain("selectVariation");
    expect(form).toContain("Ajouter un article");
    expect(form).toContain("Article personnalisé");
    expect(form).toContain('rpc("save_manual_sale_v2"');
    expect(form).toContain("Remise globale");
    expect(form).not.toContain("setMessage(error.message)");
  });
  it("renders a printable non-tax receipt",()=>{
    expect(detail).toContain("Bon de vente");
    expect(printButton).toContain("Imprimer le bon de vente");
    expect(detail).toContain("ne constitue pas une facture fiscale");
    expect(detail).toContain("record.sale_items?.map");
  });
});
