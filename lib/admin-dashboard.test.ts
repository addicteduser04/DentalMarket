import {describe,expect,it} from "vitest";
import {aggregateDashboard,buildDashboardState,countCurrentActivities,countNonInStock,type DashboardSubmission} from "./admin-dashboard";
import type {Campaign,Offer} from "./types";

const now=new Date("2026-08-31T12:00:00Z");
function submission(daysAgo:number,total:number,items:unknown=[],campaign_slug:string|null=null):DashboardSubmission{return {created_at:new Date(now.getTime()-daysAgo*86400000).toISOString(),estimated_total:total,items,campaign_slug}}
const line=(id:string,name:string,qty=1)=>({item_type:"product",product_id:id,name,qty,price:10});
function offer(overrides:Partial<Offer>={}):Offer{return {id:"o1",name:"Offre",badge_text:null,discount_type:"percentage",discount_value:10,scope:"all",category_id:null,product_id:null,starts_at:"2026-08-01T00:00:00Z",ends_at:"2026-09-01T00:00:00Z",is_active:true,...overrides}}
function campaign(overrides:Partial<Campaign>={}):Campaign{return {id:"c1",name:"Campagne",slug:"campagne",banner_image_url:null,banner_link:null,offer_id:null,starts_at:"2026-08-01T00:00:00Z",ends_at:"2026-09-01T00:00:00Z",is_active:true,...overrides}}

describe("dashboard time windows and totals",()=>{
  it("counts a submission inside 7 days in both windows",()=>{const result=aggregateDashboard([submission(3,10)],now);expect(result.sevenDays.count).toBe(1);expect(result.thirtyDays.count).toBe(1)});
  it("counts a submission older than 7 but inside 30 only in 30d",()=>{const result=aggregateDashboard([submission(10,10)],now);expect(result.sevenDays.count).toBe(0);expect(result.thirtyDays.count).toBe(1)});
  it("excludes submissions older than 30 days",()=>expect(aggregateDashboard([submission(31,10)],now).thirtyDays.count).toBe(0));
  it("returns zero count and total for empty periods",()=>expect(aggregateDashboard([],now)).toMatchObject({sevenDays:{count:0,total:0},thirtyDays:{count:0,total:0}}));
  it("sums 7d estimated totals",()=>expect(aggregateDashboard([submission(1,10),submission(6,20),submission(8,50)],now).sevenDays.total).toBe(30));
  it("sums 30d estimated totals",()=>expect(aggregateDashboard([submission(1,10),submission(20,20),submission(31,50)],now).thirtyDays.total).toBe(30));
  it("rounds decimal totals to monetary precision",()=>expect(aggregateDashboard([submission(1,.1),submission(2,.2)],now).thirtyDays.total).toBe(.3));
});

describe("dashboard top products",()=>{
  it("aggregates product-line frequency",()=>expect(aggregateDashboard([submission(1,10,[line("p1","Miroir")]),submission(2,10,[line("p1","Miroir")])],now).topProducts[0].frequency).toBe(2));
  it("does not inflate frequency using quantity",()=>expect(aggregateDashboard([submission(1,10,[line("p1","Miroir",99)])],now).topProducts[0].frequency).toBe(1));
  it("limits results to ten products",()=>expect(aggregateDashboard([submission(1,10,Array.from({length:12},(_,i)=>line(`p${i}`,`Produit ${i}`)))],now).topProducts).toHaveLength(10));
  it("uses name then id as deterministic ties",()=>{const result=aggregateDashboard([submission(1,10,[line("z","Bêta"),line("b","Alpha"),line("a","Alpha")])],now);expect(result.topProducts.map(item=>item.id)).toEqual(["a","b","z"])});
  it("ignores malformed snapshots and safely supports legacy names",()=>{const result=aggregateDashboard([submission(1,10,[null,4,{}, {name:"Ancien produit"}])],now);expect(result.topProducts).toEqual([{id:"legacy:ancien produit",name:"Ancien produit",frequency:1}])});
});

describe("dashboard stock health",()=>{
  it("excludes in_stock",()=>expect(countNonInStock(["in_stock"])).toBe(0));
  it("counts existing non-in-stock statuses",()=>expect(countNonInStock(["out_of_stock","on_order","in_stock"])).toBe(2));
});

describe("dashboard active offers",()=>{
  it("counts a currently active offer",()=>expect(countCurrentActivities([offer()],[],now).offers).toBe(1));
  it("excludes a future offer",()=>expect(countCurrentActivities([offer({starts_at:"2026-09-02"})],[],now).offers).toBe(0));
  it("excludes an expired offer",()=>expect(countCurrentActivities([offer({ends_at:"2026-08-30"})],[],now).offers).toBe(0));
  it("excludes an inactive offer",()=>expect(countCurrentActivities([offer({is_active:false})],[],now).offers).toBe(0));
  it("counts null-ended offers after start",()=>expect(countCurrentActivities([offer({ends_at:null})],[],now).offers).toBe(1));
});

describe("dashboard active campaigns",()=>{
  it("counts a currently active campaign",()=>expect(countCurrentActivities([],[campaign()],now).campaigns).toBe(1));
  it("excludes a future campaign",()=>expect(countCurrentActivities([],[campaign({starts_at:"2026-09-02"})],now).campaigns).toBe(0));
  it("excludes an expired campaign",()=>expect(countCurrentActivities([],[campaign({ends_at:"2026-08-30"})],now).campaigns).toBe(0));
  it("excludes an inactive campaign",()=>expect(countCurrentActivities([],[campaign({is_active:false})],now).campaigns).toBe(0));
  it("counts null-ended campaigns after start",()=>expect(countCurrentActivities([],[campaign({ends_at:null})],now).campaigns).toBe(1));
});

describe("dashboard campaign attribution",()=>{
  it("groups campaign slugs",()=>expect(aggregateDashboard([submission(1,10,[],"summer"),submission(2,20,[],"summer")],now).campaigns[0].count).toBe(2));
  it("groups null attribution separately",()=>expect(aggregateDashboard([submission(1,10,[],null)],now).campaigns[0].slug).toBeNull());
  it("groups estimated totals",()=>expect(aggregateDashboard([submission(1,10,[],"summer"),submission(2,20,[],"summer")],now).campaigns[0].total).toBe(30));
  it("declares and enforces the 30-day period",()=>{const result=aggregateDashboard([submission(29,10,[],"inside"),submission(31,20,[],"outside")],now);expect(result.campaigns.map(row=>row.slug)).toEqual(["inside"]);expect(result.periodStart).toBe(new Date(now.getTime()-30*86400000).toISOString())});
});

describe("dashboard query errors",()=>{
  it("returns an error state rather than fabricated zero metrics",()=>{const state=buildDashboardState({submissions:{data:null,error:{code:"42501"}},stock:{count:0,error:null},offers:{count:0,error:null},campaigns:{count:0,error:null}},now);expect(state.ok).toBe(false);expect(state).not.toHaveProperty("metrics")});
});
