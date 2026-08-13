import {describe,expect,it,vi} from "vitest";
import {CAMPAIGN_STORAGE_KEY,campaignBannerModel,campaignMutationError,captureCampaignRef,validateCampaignDraft,type CampaignDraft} from "./campaigns";
import {resolveProductDisplayPrices} from "./storefront-pricing";
import type {Campaign,Offer,Product} from "./types";

const now=new Date("2026-08-13T12:00:00Z");
const offer:Offer={id:"o1",name:"Offre",badge_text:null,discount_type:"percentage",discount_value:20,scope:"all",category_id:null,product_id:null,starts_at:"2026-08-01",ends_at:null,is_active:true};
const campaign:Campaign={id:"c1",name:"Rentrée",slug:"rentree-2026",banner_image_url:"https://example.com/banner.webp",banner_link:"/search",offer_id:"o1",starts_at:"2026-08-01T00:00:00Z",ends_at:"2026-08-31T00:00:00Z",is_active:true};
const draft:CampaignDraft={name:campaign.name,slug:campaign.slug,banner_image_url:campaign.banner_image_url,banner_link:campaign.banner_link,offer_id:campaign.offer_id,starts_at:campaign.starts_at,ends_at:campaign.ends_at,is_active:true};

describe("campaign CRUD",()=>{
  it("validates campaign creation",()=>expect(validateCampaignDraft(draft,[],[offer]).valid).toBe(true));
  it("validates campaign editing while excluding its own slug",()=>expect(validateCampaignDraft({...draft,name:"Rentrée modifiée"},[campaign],[offer],campaign.id).valid).toBe(true));
  it("provides cancel navigation without mutation",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/admin/campaign-form.tsx","utf8"));expect(source).toContain('href="/admin/campaigns"');expect(source).toContain("Annuler")});
  it("retains delete and deactivate behavior",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/admin/campaign-actions.tsx","utf8"));expect(source).toContain('.update({is_active:!campaign.is_active})');expect(source).toContain(".delete()")});
  it("rejects duplicate and query-syntax slugs with useful feedback",()=>{expect(validateCampaignDraft(draft,[{...campaign,id:"other"}],[offer]).errors.slug).toContain("déjà");expect(validateCampaignDraft({...draft,slug:"bad?ref=x"},[],[offer]).errors.slug).toBeTruthy();expect(campaignMutationError({code:"23505"})).toContain("déjà")});
  it("allows an optional offer to be cleared without retaining a stale id",()=>{const result=validateCampaignDraft({...draft,offer_id:null},[],[offer]);expect(result.valid).toBe(true);expect(result.data.offer_id).toBeNull()});
});

describe("public campaign banner",()=>{
  it("renders an active campaign banner model with its image",()=>expect(campaignBannerModel(campaign,now)?.imageUrl).toBe(campaign.banner_image_url));
  it("does not render an inactive campaign",()=>expect(campaignBannerModel({...campaign,is_active:false},now)).toBeNull());
  it("omits an invalid or missing banner image instead of producing a broken image",()=>expect(campaignBannerModel({...campaign,banner_image_url:null},now)?.imageUrl).toBeNull());
  it("uses the configured link and allows no link",()=>{expect(campaignBannerModel(campaign,now)?.href).toBe("/search");expect(campaignBannerModel({...campaign,banner_link:null},now)?.href).toBeNull()});
});

describe("campaign attribution",()=>{
  function storage(){return {setItem:vi.fn()}}
  it("captures a valid ref",async()=>{const target=storage();expect(await captureCampaignRef("rentree-2026",async()=>true,target)).toBe(true);expect(target.setItem).toHaveBeenCalledWith(CAMPAIGN_STORAGE_KEY,"rentree-2026")});
  it("leaves existing attribution unchanged when no ref is present",async()=>{const target=storage();expect(await captureCampaignRef(null,async()=>true,target)).toBe(false);expect(target.setItem).not.toHaveBeenCalled()});
  it("replaces prior attribution when a new valid ref is captured",async()=>{const values=new Map([[CAMPAIGN_STORAGE_KEY,"old"]]),target={setItem:(key:string,value:string)=>values.set(key,value)};await captureCampaignRef("new-campaign",async()=>true,target);expect(values.get(CAMPAIGN_STORAGE_KEY)).toBe("new-campaign")});
  it("does not persist an invalid or unknown ref",async()=>{const target=storage();expect(await captureCampaignRef("unknown",async()=>false,target)).toBe(false);expect(await captureCampaignRef("bad?ref=x",async()=>true,target)).toBe(false);expect(target.setItem).not.toHaveBeenCalled()});
  it("persists through navigation because capture without ref does not clear storage",async()=>{const values=new Map([[CAMPAIGN_STORAGE_KEY,"rentree-2026"]]);await captureCampaignRef(null,async()=>true,{setItem:(key,value)=>values.set(key,value)});expect(values.get(CAMPAIGN_STORAGE_KEY)).toBe("rentree-2026")});
  it("uses localStorage so attribution survives refresh and browser restart",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/storefront/campaign-capture.tsx","utf8"));expect(source).toContain("localStorage");expect(source).not.toContain("sessionStorage")});
  it("includes persisted campaign_slug in the direct cart submission",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("app/cart/page.tsx","utf8"));expect(source).toContain('campaign_slug:localStorage.getItem("active_campaign_slug")');expect(source).toContain("logCartSubmission")});
  it("keeps analytics failures non-blocking for WhatsApp",async()=>{const {beginWhatsAppHandoff}=await import("./cart-to-whatsapp");const navigate=vi.fn(),clear=vi.fn();expect(()=>beginWhatsAppHandoff([],()=>{throw new Error("offline")},clear,navigate)).not.toThrow();expect(navigate).toHaveBeenCalled()});
});

describe("campaign and offer separation",()=>{
  const product:Product={id:"p1",name:"Produit",slug:"produit",description:null,price:100,compare_at_price:null,category_id:null,images:[],stock_status:"in_stock",target_audience:"both",variations:[],is_active:true,is_featured:false};
  it("does not let campaign attribution alter product pricing",()=>expect(resolveProductDisplayPrices(product,null).currentDisplayedPrice).toBe(100));
  it("does not apply a linked campaign offer or stack it through campaign data",()=>{expect(campaign.offer_id).toBe("o1");expect(resolveProductDisplayPrices({...product,promotional_price:80},offer).currentDisplayedPrice).toBe(80)});
});
