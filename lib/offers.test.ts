import {describe,expect,it} from "vitest";
import {bestOffer,isOfferActive,priceWithOffer} from "./offers";
import {offerMutationError,validateOfferDraft,type OfferDraft} from "./offer-management";
import type {Category,Offer,Product} from "./types";

const now=new Date("2026-08-13T12:00:00Z");
const category:Category={id:"c1",name:"Instruments",slug:"instruments"};
const product:Product={id:"p1",name:"Miroir",slug:"miroir",description:null,price:100,compare_at_price:null,category_id:"c1",images:[],stock_status:"in_stock",target_audience:"both",variations:[],is_active:true,is_featured:false};
function offer(scope:Offer["scope"],overrides:Partial<Offer>={}):Offer{return {id:`${scope}-1`,name:"Offre",badge_text:null,discount_type:"percentage",discount_value:10,scope,category_id:scope==="category"?"c1":null,product_id:scope==="product"?"p1":null,starts_at:"2026-08-01T00:00:00Z",ends_at:"2026-08-31T00:00:00Z",is_active:true,created_at:"2026-08-01T00:00:00Z",...overrides}}
const validDraft:OfferDraft={name:"Rentrée",badge_text:"-10%",discount_type:"percentage",discount_value:10,scope:"all",category_id:null,product_id:null,starts_at:"2026-08-01T00:00:00Z",ends_at:null,is_active:true};

describe("best applicable offer",()=>{
  it("selects an active product offer",()=>expect(bestOffer(product,[offer("product")],now)?.scope).toBe("product"));
  it("falls back to category",()=>expect(bestOffer(product,[offer("category")],now)?.scope).toBe("category"));
  it("falls back to global",()=>expect(bestOffer(product,[offer("all")],now)?.scope).toBe("all"));
  it("prefers product over category and global",()=>expect(bestOffer(product,[offer("all"),offer("category"),offer("product")],now)?.scope).toBe("product"));
  it("prefers category over global",()=>expect(bestOffer(product,[offer("all"),offer("category")],now)?.scope).toBe("category"));
  it("ignores an inactive product offer",()=>expect(bestOffer(product,[offer("product",{is_active:false}),offer("category")],now)?.scope).toBe("category"));
  it("ignores a future product offer",()=>expect(bestOffer(product,[offer("product",{starts_at:"2026-09-01T00:00:00Z"}),offer("all")],now)?.scope).toBe("all"));
  it("ignores an expired product offer",()=>expect(bestOffer(product,[offer("product",{ends_at:"2026-08-12T00:00:00Z"}),offer("category")],now)?.scope).toBe("category"));
  it("supports a null end date after start",()=>expect(isOfferActive(offer("all",{ends_at:null}),now)).toBe(true));
  it("uses newest creation then id as the deterministic same-scope tie-break",()=>expect(bestOffer(product,[offer("product",{id:"older"}),offer("product",{id:"newer",created_at:"2026-08-02T00:00:00Z"})],now)?.id).toBe("newer"));
  it("matches only the product exact category",()=>expect(bestOffer({...product,category_id:"child"},[offer("category")],now)).toBeNull());
});

describe("offer discounts",()=>{
  it("calculates percentage discounts with monetary rounding",()=>expect(priceWithOffer(99.99,offer("all",{discount_value:10}))).toBe(89.99));
  it("calculates fixed discounts",()=>expect(priceWithOffer(100,offer("all",{discount_type:"fixed",discount_value:15}))).toBe(85));
  it("floors fixed discounts at zero",()=>expect(priceWithOffer(100,offer("all",{discount_type:"fixed",discount_value:150}))).toBe(0));
  it("rejects zero discounts",()=>expect(validateOfferDraft({...validDraft,discount_value:0},[category],[product]).valid).toBe(false));
});

describe("offer admin CRUD validation",()=>{
  it("accepts create data and clears stale targets",()=>{const result=validateOfferDraft({...validDraft,product_id:"stale",category_id:"stale"},[category],[product]);expect(result.valid).toBe(true);expect(result.data).toMatchObject({product_id:null,category_id:null})});
  it("accepts edits with all legitimate fields",()=>expect(validateOfferDraft({...validDraft,name:"Offre modifiée",scope:"product",product_id:"p1"},[category],[product]).valid).toBe(true));
  it("supports cancel without a mutation through a navigation link",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/admin/offer-form.tsx","utf8"));expect(source).toContain('href="/admin/offers"');expect(source).toContain("Annuler")});
  it("rejects invalid date ranges",()=>expect(validateOfferDraft({...validDraft,ends_at:"2026-07-31T00:00:00Z"},[category],[product]).errors.ends_at).toBeTruthy());
  it("rejects percentages above 100",()=>expect(validateOfferDraft({...validDraft,discount_value:101},[category],[product]).errors.discount_value).toBeTruthy());
  it("requires a valid scope target",()=>{expect(validateOfferDraft({...validDraft,scope:"product",product_id:null},[category],[product]).errors.product_id).toBeTruthy();expect(validateOfferDraft({...validDraft,scope:"category",category_id:"missing"},[category],[product]).errors.category_id).toBeTruthy()});
  it("retains deactivate and delete operations with useful errors",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/admin/offer-actions.tsx","utf8"));expect(source).toContain('.update({is_active:!offer.is_active})');expect(source).toContain(".delete()");expect(offerMutationError({code:"23514"})).toContain("contraintes")});
});
