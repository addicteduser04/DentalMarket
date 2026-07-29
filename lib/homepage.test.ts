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
  it("deduplicates products across homepage rows",()=>{
    const products=Array.from({length:20},(_,index)=>product(String(index+1),{is_featured:index<10,target_audience:index%2?"student":"both",promotional_price:index<4?80:null}));
    const rows=selectHomepageRows(products,[{id:"c1",name:"Instruments dentaires",slug:"instruments"}],[],products.map(item=>item.id),4);
    const ids=[...rows.offerProducts,...rows.featured,...rows.newArrivals,...rows.studentEssentials,...rows.instruments,...rows.categoryRows.flatMap(row=>row.products)].map(item=>item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("omits empty category rows",()=>{
    const rows=selectHomepageRows([product("1")],[{id:"empty",name:"Vide",slug:"vide"}],[],[],8);
    expect(rows.categoryRows).toEqual([]);
  });
  it("provides French and Arabic marketplace labels",()=>{
    expect(translate("fr","recommendedSupplies")).toBe("Fournitures recommandées");
    expect(translate("ar","recommendedSupplies")).toBe("المستلزمات الموصى بها");
  });
});
