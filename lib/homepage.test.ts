import {describe,expect,it} from "vitest";
import {hasActivePromotion,selectHomepageRows} from "./homepage";
import type {Product} from "./types";
import {translate} from "./i18n";

const product=(id:string,extra:Partial<Product>={}):Product=>({
  id,name:id,slug:id,description:null,price:100,compare_at_price:null,category_id:"c1",
  images:[],stock_status:"in_stock",target_audience:"both",variations:[],is_active:true,
  is_featured:false,publication_status:"published",created_at:`2026-01-${id.padStart(2,"0")}`,...extra,
});

describe("homepage selection",()=>{
  it("accepts only currently valid product promotions",()=>{
    expect(hasActivePromotion(product("1",{promotional_price:80,promotion_ends_at:"2026-02-01"}),[],new Date("2026-01-01"))).toBe(true);
    expect(hasActivePromotion(product("2",{promotional_price:80,promotion_ends_at:"2025-12-01"}),[],new Date("2026-01-01"))).toBe(false);
  });
  it("keeps primary rows source-driven while deduplicating secondary discovery rows",()=>{
    const products=Array.from({length:20},(_,index)=>product(String(index+1),{is_featured:index<10,target_audience:index%2?"student":"both",promotional_price:index<4?80:null}));
    const rows=selectHomepageRows(products,[{id:"c1",name:"Instruments dentaires",slug:"instruments"}],[],products.map(item=>item.id),4);
    expect(rows.offerProducts.every(item=>item.promotional_price!=null)).toBe(true);
    expect(rows.featured.every(item=>item.is_featured)).toBe(true);
    const secondary=[...rows.studentEssentials,...rows.instruments,...rows.categoryRows.flatMap(row=>row.products)].map(item=>item.id);
    expect(new Set(secondary).size).toBe(secondary.length);
  });
  it("omits empty category rows",()=>{
    const rows=selectHomepageRows([product("1")],[{id:"empty",name:"Vide",slug:"vide"}],[],[],8);
    expect(rows.categoryRows).toEqual([]);
  });
  it("provides French and Arabic marketplace labels",()=>{
    expect(translate("fr","recommendedSupplies")).toBe("Fournitures recommandées");
    expect(translate("ar","recommendedSupplies")).toBe("المستلزمات الموصى بها");
  });
  it("uses only is_featured products for the DENTANOVA selection",()=>{const rows=selectHomepageRows([product("1",{is_featured:true}),product("2")],[],[],[],8);expect(rows.featured.map(item=>item.id)).toEqual(["1"])});
  it("does not promote a non-featured product merely because it is new",()=>{const rows=selectHomepageRows([product("1",{created_at:"2026-01-01"}),product("2",{created_at:"2026-02-01"})],[],[],[],8);expect(rows.featured).toEqual([]);expect(rows.newArrivals[0].id).toBe("2")});
  it("orders new visible products by created_at with deterministic ties",()=>{const rows=selectHomepageRows([product("b",{name:"Bêta",created_at:"2026-02-01"}),product("a",{name:"Alpha",created_at:"2026-02-01"}),product("old",{created_at:"2026-01-01"})],[],[],[],8);expect(rows.newArrivals.map(item=>item.id)).toEqual(["a","b","old"])});
  it("keeps hidden products out of every merchandising row",()=>{const rows=selectHomepageRows([product("inactive",{is_active:false,is_featured:true,promotional_price:80}),product("draft",{publication_status:"draft",is_featured:true,promotional_price:80})],[],[],[],8);expect(rows.offerProducts).toEqual([]);expect(rows.featured).toEqual([]);expect(rows.newArrivals).toEqual([])});
  it("uses active product promotions and table offers without manual substitution",()=>{const activeOffer={id:"o1",name:"Offre",badge_text:null,discount_type:"percentage" as const,discount_value:10,scope:"product" as const,category_id:null,product_id:"offer",starts_at:"2026-01-01",ends_at:null,is_active:true};const rows=selectHomepageRows([product("promo",{promotional_price:80}),product("offer")],[],[activeOffer],[],8);expect(rows.offerProducts.map(item=>item.id)).toEqual(["promo","offer"])});
  it("handles empty merchandising sections without fabricated products",()=>{const rows=selectHomepageRows([],[],[],[],8);expect(rows.offerProducts).toEqual([]);expect(rows.featured).toEqual([]);expect(rows.newArrivals).toEqual([])});
  it("provides localized merchandising labels",()=>{expect(translate("fr","recommendedProducts")).toBe("Sélection DENTANOVA");expect(translate("ar","recommendedProducts")).toBe("اختيارات DENTANOVA");expect(translate("fr","offersToday")).toBe("En promotion");expect(translate("ar","newArrivals")).toBe("وصل حديثاً")});
});
