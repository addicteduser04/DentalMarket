"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, HeartOff, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import { BrandLogo } from "@/components/brand-logo";
import { money } from "@/lib/utils";

type FavoriteItem={created_at:string;product:{id:string;name:string;slug:string;price:number;images:string[];stock_status:string;categories?:{name:string;slug:string}|null}};
export function FavoritesList({initial}:{initial:FavoriteItem[]}) {
  const [items,setItems]=useState(initial),[query,setQuery]=useState(""),[category,setCategory]=useState("all"),[message,setMessage]=useState("");
  const categories=[...new Set(items.map(item=>item.product.categories?.name).filter(Boolean))] as string[];
  const filtered=useMemo(()=>items.filter(item=>(category==="all"||item.product.categories?.name===category)&&item.product.name.toLowerCase().includes(query.toLowerCase())),[items,query,category]);
  async function remove(productId:string){const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)return;const {error}=await db.from("favorites").delete().eq("user_id",user.id).eq("product_id",productId);if(!error){setItems(old=>old.filter(item=>item.product.id!==productId));setMessage("Favori retiré.")}}
  async function clear(){if(!window.confirm("Retirer tous les produits de vos favoris ?"))return;const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)return;const {error}=await db.from("favorites").delete().eq("user_id",user.id);if(!error){setItems([]);setMessage("Tous les favoris ont été retirés.")}}
  if(!items.length)return <div className="account-empty"><HeartOff size={28}/><h2>Aucun favori enregistré</h2><p>Ajoutez des produits depuis le catalogue pour les retrouver ici.</p><Link href="/search" className="account-button">Découvrir le catalogue</Link></div>;
  return <div>
    <div className="account-panel flex flex-col gap-3 p-4 md:flex-row">
      <label className="account-search flex-1"><Search size={18}/><span className="sr-only">Rechercher dans les favoris</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher dans mes favoris…"/></label>
      <select value={category} onChange={e=>setCategory(e.target.value)} className="account-select"><option value="all">Toutes les catégories</option>{categories.map(value=><option key={value}>{value}</option>)}</select>
      <button onClick={clear} className="account-danger-button"><Trash2 size={16}/>Tout retirer</button>
    </div>
    {message&&<p role="status" className="account-feedback mt-4">{message}</p>}
    {!filtered.length?<div className="account-empty mt-5"><Search/><h2>Aucun résultat</h2><p>Modifiez votre recherche ou votre filtre.</p></div>:<div className="mt-5 grid gap-4 md:grid-cols-2">{filtered.map(item=><article key={item.product.id} className="account-panel overflow-hidden">
      <div className="relative aspect-[16/9] bg-white/[.04]">{item.product.images?.[0]?<Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover"/>:<div className="grid h-full place-items-center text-white/30">{<BrandLogo compact inverted/>}</div>}</div>
      <div className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">{item.product.categories?.name||"Catalogue"}</p><h2 className="mt-2 text-xl font-bold">{item.product.name}</h2><div className="mt-3 flex items-center justify-between"><span className="font-bold">{money(Number(item.product.price))}</span><span className="text-xs text-white/45">{item.product.stock_status==="in_stock"?"En stock":item.product.stock_status==="on_order"?"Sur commande":"Indisponible"}</span></div><p className="mt-3 text-xs text-white/35">Ajouté le {new Date(item.created_at).toLocaleDateString("fr-MA")}</p><div className="mt-5 flex flex-wrap gap-2"><Link href={`/product/${item.product.slug}`} className="account-button-secondary">Voir <ExternalLink size={15}/></Link><a href={createWhatsAppUrl(`Bonjour DENTANOVA, je souhaite des informations sur ${item.product.name}.`)} className="account-button-secondary">WhatsApp</a><button onClick={()=>remove(item.product.id)} className="account-danger-button ml-auto"><HeartOff size={15}/></button></div></div>
    </article>)}</div>}
  </div>
}
