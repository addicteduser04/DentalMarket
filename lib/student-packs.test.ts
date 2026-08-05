import {describe,expect,it} from "vitest";
import {activePackPrice,packAvailability,packCartKey,packSavings,type StudentPack} from "./student-packs";
import {buildWhatsAppMessage} from "./cart-to-whatsapp";
const pack=(overrides:Partial<StudentPack>={}):StudentPack=>({
 id:"p1",university_id:"u1",academic_year_id:"y2",name:"Pack",slug:"pack",gallery:[],
 publication_status:"published",availability_strategy:"components",is_featured:false,display_order:0,
 manual_price:100,promotional_price:80,student_pack_components:[],...overrides,
});
describe("student pack commerce",()=>{
 it("applies only a valid active promotion",()=>{expect(activePackPrice(pack())).toBe(80);expect(activePackPrice(pack({promotional_price:120}))).toBe(100);expect(activePackPrice(pack({promotion_starts_at:"2999-01-01"}))).toBe(100)});
 it("never fabricates savings",()=>{expect(packSavings(pack({component_total:150}))).toEqual({amount:70,percentage:70/150*100});expect(packSavings(pack({component_total:70}))).toBeNull();expect(packSavings(pack({component_total:null}))).toBeNull()});
 it("keeps every student pack available independently of component stock",()=>{const value=pack({availability_strategy:"manual",availability_override:"out_of_stock",student_pack_components:[{id:"c",pack_id:"p1",product_id:"x",quantity:1,is_required:true,display_order:0}]});expect(packAvailability(value)).toEqual({status:"in_stock",quantity:null})});
 it("uses a namespace distinct from catalogue products",()=>expect(packCartKey("same-id")).toBe("pack:same-id"));
 it("builds a complete sanitized pack WhatsApp summary",()=>{const message=buildWhatsAppMessage([{itemType:"student_pack",name:"Pack clinique",university:"UM6SS RABAT",academicYear:"Deuxième année",academicSession:"2026",packCode:"PACK-15148",componentSummary:["1× Cahier"],quantity:1,price:1682}]);expect(message).toContain("DENTANOVA");expect(message).toContain("UM6SS RABAT");expect(message).toContain("Deuxième année");expect(message).toContain("PACK-15148");expect(message).toContain("1× Cahier")});
});
