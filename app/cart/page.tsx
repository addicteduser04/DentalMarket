"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/utils";
import { buildWhatsAppMessage } from "@/lib/cart-to-whatsapp";
import { createWhatsAppUrl, DELIVERY_CITY } from "@/lib/whatsapp";
import { EmptyState } from "@/components/ui/empty-state";

export default function CartPage() {
  const { items, remove, setQuantity, clear } = useCart();
  const [deliveryAccepted, setDeliveryAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum,item) => sum + item.price * item.quantity, 0);

  async function submit() {
    if (!items.length || !deliveryAccepted || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cart-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryAccepted,
          deliveryCity: DELIVERY_CITY,
          campaignSlug: localStorage.getItem("active_campaign_slug"),
          items: items.map(item => ({
            product_id: item.productId,
            name: item.name,
            variation_label: item.variationLabel,
            qty: item.quantity,
            price: item.price,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de préparer la demande.");

      const destination = createWhatsAppUrl(buildWhatsAppMessage(items));
      clear();
      window.location.assign(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de préparer la demande.");
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return <div className="container-shell py-20"><EmptyState title="Votre panier est vide" text="Découvrez notre sélection d’instruments et ajoutez ce qu’il vous faut."/></div>;
  }

  return <div className="container-shell py-14">
    <p className="eyebrow">Votre sélection</p>
    <h1 className="display mt-3 text-5xl">Le panier</h1>
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        {items.map(item => <div key={item.key} className="card flex items-center gap-4 p-4">
          {item.image && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white"><Image src={item.image} fill alt="" className="object-cover"/></div>}
          <div className="min-w-0 flex-1">
            <Link href={`/product/${item.slug}`} className="font-bold">{item.name}</Link>
            {item.variationLabel && <p className="mt-1 text-xs text-ink/45">{item.variationLabel}</p>}
            <p className="mt-2 text-sm font-bold text-sage">{money(item.price)}</p>
          </div>
          <div className="flex items-center rounded-full border border-ink/15 bg-white">
            <button aria-label="Réduire" className="p-2" onClick={() => setQuantity(item.key,item.quantity-1)}><Minus size={14}/></button>
            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
            <button aria-label="Augmenter" className="p-2" onClick={() => setQuantity(item.key,item.quantity+1)}><Plus size={14}/></button>
          </div>
          <button aria-label="Supprimer" onClick={() => remove(item.key)} className="p-2 text-ink/35 hover:text-coral"><Trash2 size={18}/></button>
        </div>)}
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="display text-2xl">Récapitulatif</h2>
        <div className="mt-5 rounded-xl border border-sage/25 bg-mint/60 p-4 text-sm leading-6">
          <b>Livraison à Casablanca uniquement</b>
          <p className="mt-1 text-ink/60">DENTALNOVA livre actuellement exclusivement à Casablanca.</p>
        </div>
        <div className="mt-6 grid gap-3 border-b border-ink/10 pb-5 text-sm">
          <div className="flex justify-between"><span className="text-ink/55">Articles</span><span>{items.reduce((sum,item) => sum+item.quantity,0)}</span></div>
          <div className="flex justify-between"><span className="text-ink/55">Ville</span><strong>{DELIVERY_CITY}</strong></div>
          <div className="flex justify-between"><span className="text-ink/55">Livraison</span><span>À convenir</span></div>
        </div>
        <div className="flex justify-between py-6 text-lg font-bold"><span>Total estimé</span><span>{money(total)}</span></div>
        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-white p-4 text-sm leading-5">
          <input type="checkbox" checked={deliveryAccepted} onChange={event => setDeliveryAccepted(event.target.checked)} className="mt-1 h-4 w-4"/>
          <span>Je confirme que l’adresse de livraison se situe à Casablanca.</span>
        </label>
        <button onClick={submit} disabled={!deliveryAccepted || submitting} className="button w-full !bg-[#1f9d55] disabled:cursor-not-allowed disabled:opacity-45">
          {submitting ? "Préparation…" : "Confirmer sur WhatsApp"}
        </button>
        {error && <p role="alert" className="mt-4 rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
        <p className="mt-4 flex gap-2 text-xs leading-5 text-ink/45"><ShieldCheck size={28}/> Aucun paiement en ligne. Vous finalisez les détails directement avec notre conseiller.</p>
      </aside>
    </div>
  </div>;
}
