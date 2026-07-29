"use client";
import {ShoppingBag} from "lucide-react";
import {useCart} from "@/lib/cart-store";
import type {StudentPack} from "@/lib/student-packs";
import {activePackPrice,packAvailability} from "@/lib/student-packs";
import {money} from "@/lib/utils";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

export function PackAddToCart({pack,locale="fr"}:{pack:StudentPack;locale?:Locale}){
  const add=useCart(state=>state.add),price=activePackPrice(pack),availability=packAvailability(pack);
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  const disabled=price==null||availability.status!=="in_stock";
  return <button disabled={disabled} className="button w-full disabled:opacity-40" onClick={()=>add({
    itemType:"student_pack",packId:pack.id,slug:pack.slug,name:pack.name,image:pack.image_url||undefined,
    university:pack.universities?.acronym,universitySlug:pack.universities?.slug,academicYear:pack.academic_years?.label_fr,
    academicSession:pack.academic_session||undefined,packCode:pack.pack_code||undefined,
    componentSummary:(pack.student_pack_components||[]).slice(0,8).map(c=>`${c.quantity}× ${c.products?.name||t("components")}`),
    price:price||0,
  })}><ShoppingBag size={18}/>{disabled?t("unavailable"):`${t("addPack")} · ${money(price||0)}`}</button>
}
