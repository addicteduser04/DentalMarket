"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient,hasSupabaseEnv } from "@/lib/supabase/client";
import { offerMutationError, validateOfferDraft, type OfferDraft } from "@/lib/offer-management";
import type { Category,Offer,Product } from "@/lib/types";

function datetime(value?:string|null){return value ? value.slice(0,16) : ""}

export function OfferForm({categories,products,offer}:{categories:Category[];products:Product[];offer?:Offer}){
  const [scope,setScope]=useState<Offer["scope"]>(offer?.scope??"all"),[msg,setMsg]=useState(""),[errors,setErrors]=useState<Partial<Record<keyof OfferDraft,string>>>({}),router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setMsg("");
    if(!hasSupabaseEnv){setMsg("Connectez Supabase pour enregistrer.");return}
    const f=new FormData(e.currentTarget), result=validateOfferDraft({
      name:String(f.get("name")??""),badge_text:String(f.get("badge_text")??"")||null,
      discount_type:String(f.get("discount_type")) as Offer["discount_type"],discount_value:Number(f.get("discount_value")),scope,
      category_id:scope==="category"?String(f.get("category_id")??""):null,product_id:scope==="product"?String(f.get("product_id")??""):null,
      starts_at:String(f.get("starts_at")??""),ends_at:String(f.get("ends_at")??"")||null,is_active:f.has("is_active"),
    },categories,products);
    setErrors(result.errors);if(!result.valid)return;
    const query=createClient().from("offers"),{error}=offer?await query.update(result.data).eq("id",offer.id):await query.insert(result.data);
    if(error){setMsg(offerMutationError(error));return}
    router.push("/admin/offers");router.refresh();
  }
  const error=(key:keyof OfferDraft)=>errors[key]?<p className="mt-1 text-xs text-red-300">{errors[key]}</p>:null;
  return <form onSubmit={submit} className="card mt-7 grid gap-5 p-6"><div className="grid gap-5 md:grid-cols-2">
    <label className="text-sm font-bold">Nom<input required name="name" defaultValue={offer?.name} className="field mt-2"/>{error("name")}</label>
    <label className="text-sm font-bold">Badge<input name="badge_text" defaultValue={offer?.badge_text??""} className="field mt-2" placeholder="-20%"/></label>
    <label className="text-sm font-bold">Réduction<select name="discount_type" defaultValue={offer?.discount_type??"percentage"} className="field mt-2"><option value="percentage">Pourcentage</option><option value="fixed">Montant fixe</option></select></label>
    <label className="text-sm font-bold">Valeur<input required type="number" min="0.01" step=".01" name="discount_value" defaultValue={offer?.discount_value} className="field mt-2"/>{error("discount_value")}</label>
    <label className="text-sm font-bold">Portée<select name="scope" value={scope} onChange={e=>setScope(e.target.value as Offer["scope"])} className="field mt-2"><option value="all">Tout le catalogue</option><option value="category">Une catégorie</option><option value="product">Un produit</option></select></label>
    {scope==="category"?<label className="text-sm font-bold">Catégorie<select required name="category_id" defaultValue={offer?.category_id??""} className="field mt-2"><option value="">Sélectionner</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{error("category_id")}</label>:null}
    {scope==="product"?<label className="text-sm font-bold">Produit<select required name="product_id" defaultValue={offer?.product_id??""} className="field mt-2"><option value="">Sélectionner</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{error("product_id")}</label>:null}
    <label className="text-sm font-bold">Début<input required type="datetime-local" name="starts_at" defaultValue={datetime(offer?.starts_at) || datetime(new Date().toISOString())} className="field mt-2"/>{error("starts_at")}</label>
    <label className="text-sm font-bold">Fin (optionnelle)<input type="datetime-local" name="ends_at" defaultValue={datetime(offer?.ends_at)} className="field mt-2"/>{error("ends_at")}</label>
    <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="is_active" defaultChecked={offer?.is_active??true}/> Offre active</label>
  </div><div className="flex gap-3"><button type="submit" className="button">{offer?"Enregistrer":"Créer l’offre"}</button><Link href="/admin/offers" className="button bg-white/10">Annuler</Link></div>{msg?<p className="text-sm text-red-300">{msg}</p>:null}</form>
}
