"use client";

import {ProductImage} from "@/components/storefront/product-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/utils";
import { beginWhatsAppHandoff } from "@/lib/cart-to-whatsapp";
import { logCartSubmission } from "@/lib/cart-submission-analytics";
import { DELIVERY_ZONE } from "@/lib/whatsapp";
import { EmptyState } from "@/components/ui/empty-state";
import {createClient,hasSupabaseEnv} from "@/lib/supabase/client";

export default function CartPage() {
  const { items, remove, setQuantity, clear } = useCart();
  const [deliveryAccepted, setDeliveryAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customer,setCustomer]=useState<{id:string|null;name?:string}>({id:null});
  const total = items.reduce((sum,item) => sum + item.price * item.quantity, 0);

  useEffect(()=>{
    if(!hasSupabaseEnv)return;
    const db=createClient();
    void db.auth.getUser().then(({data:{user}})=>setCustomer({
      id:user?.id??null,
      name:typeof user?.user_metadata?.full_name==="string"?user.user_metadata.full_name:undefined,
    })).catch(()=>undefined);
  },[]);

  function submit() {
    if (!items.length || !deliveryAccepted || submitting) return;
    setSubmitting(true);
    beginWhatsAppHandoff(items,()=>logCartSubmission({
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
      }),clear,destination=>window.location.assign(destination),customer.name);
  }

  if (!items.length) {
    return <div className="store-page"><div className="container-shell py-20"><EmptyState title="Votre panier est vide" text="Découvrez notre sélection d’instruments et ajoutez ce qu’il vous faut."/></div></div>;
  }

  return <div className="store-page"><div className="container-shell py-14">
    <p className="eyebrow">Votre sélection</p>
    <h1 className="display mt-3 text-5xl">Le panier</h1>
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        {items.map(item => <div key={item.key} className="card flex items-center gap-4 p-4">
          {item.image && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white"><ProductImage src={item.image} alt={item.name} sizes="96px" className="p-1"/></div>}
          <div className="min-w-0 flex-1">
            <Link href={item.itemType==="student_pack"?`/student-packs/${item.universitySlug||"pack"}/${item.slug}`:`/product/${item.slug}`} className="font-bold">{item.name}</Link>
            {item.variationLabel && <p className="mt-1 text-xs text-white/45">{item.variationLabel}</p>}
            {item.optionalComponentSummary?.length ? <p className="mt-1 text-xs leading-5 text-white/55">Options : {item.optionalComponentSummary.join(", ")}</p> : null}
            <p className="mt-2 text-sm font-bold text-cyan-300">{money(item.price)}</p>
          </div>
          <div className="flex items-center rounded-full border border-white/15 bg-white/[.04]">
            <button aria-label="Réduire" className="p-2" onClick={() => setQuantity(item.key,item.quantity-1)}><Minus size={14}/></button>
            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
            <button aria-label="Augmenter" className="p-2" onClick={() => setQuantity(item.key,item.quantity+1)}><Plus size={14}/></button>
          </div>
          <button aria-label="Supprimer" onClick={() => remove(item.key)} className="p-2 text-white/35 hover:text-red-300"><Trash2 size={18}/></button>
        </div>)}
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="display text-2xl">Récapitulatif</h2>
        <div className="status-success mt-5 rounded-xl p-4 text-sm leading-6">
          <b>Livraison partout au Maroc</b>
          <p className="mt-1 text-white/60">Nous livrons votre commande dans toutes les villes du Maroc.</p>
        </div>
        <div className="mt-6 grid gap-3 border-b border-ink/10 pb-5 text-sm">
          <div className="flex justify-between"><span className="text-white/55">Articles</span><span>{items.reduce((sum,item) => sum+item.quantity,0)}</span></div>
          <div className="flex justify-between"><span className="text-white/55">Zone</span><strong>{DELIVERY_ZONE}</strong></div>
          <div className="flex justify-between"><span className="text-white/55">Livraison</span><span>À convenir</span></div>
        </div>
        <div className="flex justify-between py-6 text-lg font-bold"><span>Total estimé</span><span>{money(total)}</span></div>
        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm leading-5">
          <input type="checkbox" checked={deliveryAccepted} onChange={event => setDeliveryAccepted(event.target.checked)} className="mt-1 h-4 w-4"/>
          <span>Je confirme que l’adresse de livraison se situe au Maroc.</span>
        </label>
        <button onClick={submit} disabled={!deliveryAccepted || submitting} className="button w-full !bg-[#1f9d55] disabled:cursor-not-allowed disabled:opacity-45">
          {submitting ? "Préparation…" : "Confirmer sur WhatsApp"}
        </button>
        <p className="mt-4 flex gap-2 text-xs leading-5 text-white/45"><ShieldCheck size={28}/> Aucun paiement en ligne. Vous finalisez les détails directement avec notre conseiller.</p>
      </aside>
    </div>
  </div></div>;
}
