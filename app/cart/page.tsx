"use client";

import {ProductImage} from "@/components/storefront/product-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/utils";
import { beginValidatedWhatsAppHandoff } from "@/lib/cart-to-whatsapp";
import { logCartSubmission } from "@/lib/cart-submission-analytics";
import { EmptyState } from "@/components/ui/empty-state";
import {createClient,hasSupabaseEnv} from "@/lib/supabase/client";
import {translate,type Locale} from "@/lib/i18n";

export default function CartPage() {
  const { items, remove, setQuantity, clear } = useCart();
  const [deliveryAccepted, setDeliveryAccepted] = useState(false);
  const [deliveryCity,setDeliveryCity]=useState(""),[cityError,setCityError]=useState("");
  const [locale,setLocale]=useState<Locale>("fr");
  const cityRef=useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customer,setCustomer]=useState<{id:string|null;name?:string}>({id:null});
  const total = items.reduce((sum,item) => sum + item.price * item.quantity, 0);
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);

  useEffect(()=>{
    queueMicrotask(()=>setLocale(document.documentElement.lang==="ar"?"ar":"fr"));
    if(!hasSupabaseEnv)return;
    const db=createClient();
    void db.auth.getUser().then(({data:{user}})=>setCustomer({
      id:user?.id??null,
      name:typeof user?.user_metadata?.full_name==="string"?user.user_metadata.full_name:undefined,
    })).catch(()=>undefined);
  },[]);

  function submit() {
    if (!items.length || !deliveryAccepted || submitting) return;
    const result=beginValidatedWhatsAppHandoff(items,deliveryCity,city=>logCartSubmission({
        items: items.map(item => ({
          item_type:item.itemType,
          product_id:item.productId,
          pack_id:item.packId,
          name:item.name,
          variation_id:item.variationId,
          variation_sku:item.variationSku,
          variation_label:item.variationLabel,
          qty:item.quantity,
          price:item.price,
          university:item.university,
          academic_year:item.academicYear,
          academic_session:item.academicSession,
          pack_code:item.packCode,
          component_summary:item.componentSummary,
          optional_component_ids:item.optionalComponentIds,
          optional_component_summary:item.optionalComponentSummary,
        })),
        estimated_total:total,
        user_id:customer.id,
        campaign_slug:localStorage.getItem("active_campaign_slug"),
        delivery_city:city,
      }),clear,destination=>window.location.assign(destination),customer.name);
    if(!result.ok){setCityError(t("deliveryCityRequired"));cityRef.current?.focus();return}
    setCityError("");setSubmitting(true);
  }

  if (!items.length) {
    return <div className="store-page"><div className="container-shell py-20"><EmptyState title={t("emptyCartTitle")} text={t("emptyCartText")}/></div></div>;
  }

  return <div className="store-page"><div className="container-shell py-14">
    <p className="eyebrow">{t("cartSelection")}</p>
    <h1 className="display mt-3 text-5xl">{t("cartTitle")}</h1>
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        {items.map(item => <div key={item.key} className="card flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-4">
          {item.image && <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white sm:h-24 sm:w-24"><ProductImage src={item.image} alt={item.name} sizes="(max-width: 640px) 80px, 96px" className="p-1"/></div>}
          <div className="min-w-0 flex-1">
            <Link href={item.itemType==="student_pack"?`/student-packs/${item.universitySlug||"pack"}/${item.slug}`:`/product/${item.slug}`} className="font-bold">{item.name}</Link>
            {item.variationLabel && <p className="mt-1 text-xs text-white/45">{item.variationLabel}</p>}
            {item.optionalComponentSummary?.length ? <p className="mt-1 text-xs leading-5 text-white/55">{t("options")} : {item.optionalComponentSummary.join(", ")}</p> : null}
            <p className="mt-2 text-sm font-bold text-cyan-300">{money(item.price)}</p>
          </div>
          <div className="ml-auto flex items-center rounded-full border border-white/15 bg-white/[.04]">
            <button aria-label={t("decreaseQuantity")} className="grid h-10 w-10 place-items-center" onClick={() => setQuantity(item.key,item.quantity-1)}><Minus size={14}/></button>
            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
            <button aria-label={t("increaseQuantity")} className="grid h-10 w-10 place-items-center" onClick={() => setQuantity(item.key,item.quantity+1)}><Plus size={14}/></button>
          </div>
          <button aria-label={t("removeItem")} onClick={() => remove(item.key)} className="grid h-10 w-10 place-items-center text-white/35 hover:text-red-300"><Trash2 size={18}/></button>
        </div>)}
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="display text-2xl">{t("cartSummary")}</h2>
        <div className="status-success mt-5 rounded-xl p-4 text-sm leading-6">
          <b>{t("deliveryMorocco")}</b>
          <p className="mt-1 text-white/60">{t("deliveryMoroccoText")}</p>
        </div>
        <div className="mt-6 grid gap-3 border-b border-ink/10 pb-5 text-sm">
          <div className="flex justify-between"><span className="text-white/55">{t("items")}</span><span>{items.reduce((sum,item) => sum+item.quantity,0)}</span></div>
          <div className="flex justify-between"><span className="text-white/55">{t("delivery")}</span><span>{t("toArrange")}</span></div>
        </div>
        <div className="flex justify-between py-6 text-lg font-bold"><span>{t("estimatedTotal")}</span><span>{money(total)}</span></div>
        <label className="mb-5 block text-sm font-bold" htmlFor="delivery-city">{t("deliveryCity")}<input ref={cityRef} id="delivery-city" value={deliveryCity} onChange={event=>{setDeliveryCity(event.target.value);if(cityError)setCityError("")}} placeholder={t("deliveryCityPlaceholder")} aria-invalid={Boolean(cityError)} aria-describedby={cityError?"delivery-city-error":undefined} className="field mt-2"/>{cityError?<span id="delivery-city-error" role="alert" className="mt-2 block text-xs text-red-300">{cityError}</span>:null}</label>
        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm leading-5">
          <input type="checkbox" checked={deliveryAccepted} onChange={event => setDeliveryAccepted(event.target.checked)} className="mt-1 h-4 w-4"/>
          <span>{t("deliveryConfirmation")}</span>
        </label>
        <button onClick={submit} disabled={!deliveryAccepted || submitting} className="button w-full !bg-[#1f9d55] disabled:cursor-not-allowed disabled:opacity-45">
          {submitting ? t("preparing") : t("confirmWhatsApp")}
        </button>
        <p className="mt-4 flex gap-2 text-xs leading-5 text-white/45"><ShieldCheck className="shrink-0" size={28}/> {t("noOnlinePayment")}</p>
      </aside>
    </div>
  </div></div>;
}
