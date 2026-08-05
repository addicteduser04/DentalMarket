"use client";

import Image from "next/image";
import {Check, ShoppingBag, X} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {useCart} from "@/lib/cart-store";
import type {PackComponent, StudentPack} from "@/lib/student-packs";
import {activePackPrice,packAvailability} from "@/lib/student-packs";
import {money} from "@/lib/utils";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

function optionPrice(component:PackComponent){
  if(component.price_snapshot!=null) return Number(component.price_snapshot);
  const product=component.products;
  const variation=component.variation_id?product?.variations?.find(item=>item.id===component.variation_id||item.source_id===component.variation_id):undefined;
  return Number(variation?.price??product?.promotional_price??product?.price??0);
}

export function PackAddToCart({pack,locale="fr"}:{pack:StudentPack;locale?:Locale}){
  const add=useCart(state=>state.add),price=activePackPrice(pack),availability=packAvailability(pack);
  const [open,setOpen]=useState(false),[selected,setSelected]=useState<string[]>([]);
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  const optional=useMemo(()=>(pack.student_pack_components||[]).filter(component=>!component.is_required).sort((a,b)=>a.display_order-b.display_order),[pack.student_pack_components]);
  const chosen=optional.filter(component=>selected.includes(component.id));
  const optionTotal=chosen.reduce((sum,component)=>sum+optionPrice(component)*component.quantity,0);
  const total=(price||0)+optionTotal;
  const disabled=price==null||availability.status!=="in_stock";

  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",close);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",close)};
  },[open]);

  function addPack(){
    add({itemType:"student_pack",packId:pack.id,slug:pack.slug,name:pack.name,image:pack.image_url||undefined,
      university:pack.universities?.acronym,universitySlug:pack.universities?.slug,academicYear:pack.academic_years?.label_fr,
      academicSession:pack.academic_session||undefined,packCode:pack.pack_code||undefined,
      componentSummary:(pack.student_pack_components||[]).filter(c=>c.is_required).slice(0,8).map(c=>`${c.quantity}× ${c.products?.name||t("components")}`),
      optionalComponentIds:chosen.map(c=>c.id),optionalComponentSummary:chosen.map(c=>`${c.quantity}× ${c.products?.name||t("components")}`),price:total});
    setOpen(false);setSelected([]);
  }

  return <>
    <button disabled={disabled} className="button w-full disabled:opacity-40" onClick={()=>optional.length?setOpen(true):addPack()}>
      <ShoppingBag size={18}/>{disabled?t("unavailable"):`${t("addPack")} · ${money(price||0)}`}
    </button>
    {open&&<div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="pack-options-title" className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{pack.name}</p><h2 id="pack-options-title" className="display mt-2 text-3xl">{t("chooseOptions")}</h2><p className="mt-2 text-sm text-white/55">{t("optionsIntro")}</p></div><button className="rounded-full border border-white/15 p-2 text-white/60 hover:text-white" onClick={()=>setOpen(false)} aria-label={t("close")}><X size={19}/></button></div>
        <div className="mt-6 grid gap-3">{optional.map(component=>{const product=component.products,checked=selected.includes(component.id),unitPrice=optionPrice(component),linePrice=unitPrice*component.quantity;return <label key={component.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${checked?"border-cyan-300 bg-cyan-300/10":"border-white/10 bg-white/[.025] hover:border-white/25"}`}>
          <input className="sr-only" type="checkbox" checked={checked} onChange={()=>setSelected(current=>checked?current.filter(id=>id!==component.id):[...current,component.id])}/>
          {product?.images?.[0]?<span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Image src={product.images[0]} fill alt="" sizes="64px" className="object-cover"/></span>:null}
          <span className="min-w-0 flex-1"><b className="block">{product?.name}</b><small className="mt-1 block text-white/45">×{component.quantity}{component.notes?` · ${component.notes}`:""}</small></span>
          <span className="text-right"><b className="block text-cyan-300">+ {money(linePrice)}</b><span className={`ml-auto mt-2 grid h-6 w-6 place-items-center rounded-full border ${checked?"border-cyan-300 bg-cyan-300 text-slate-950":"border-white/25"}`}>{checked?<Check size={15}/>:null}</span></span>
        </label>})}</div>
        <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-sm text-white/50">{t("packPrice")} + {t("selectedOptions")}</span><strong className="mt-1 block text-2xl text-cyan-300">{money(total)}</strong></div><button className="button sm:min-w-56" onClick={addPack}><ShoppingBag size={18}/>{selected.length?t("addWithOptions"):t("noOptions")}</button></div>
      </section>
    </div>}
  </>;
}
