"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Offer } from "@/lib/types";

export function OfferActions({offer}:{offer:Offer}){
  const [message,setMessage]=useState(""),router=useRouter();
  async function toggle(){setMessage("");const {error}=await createClient().from("offers").update({is_active:!offer.is_active}).eq("id",offer.id);if(error){setMessage("Impossible de modifier l’état de l’offre.");return}router.refresh()}
  async function remove(){if(!window.confirm("Supprimer définitivement cette offre ?"))return;setMessage("");const {error}=await createClient().from("offers").delete().eq("id",offer.id);if(error){setMessage("Impossible de supprimer l’offre.");return}router.refresh()}
  return <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/offers/${offer.id}/edit`} className="text-cyan-300 hover:underline">Modifier</Link><button type="button" onClick={toggle} className="text-amber-300 hover:underline">{offer.is_active?"Désactiver":"Activer"}</button><button type="button" onClick={remove} className="text-red-300 hover:underline">Supprimer</button>{message?<span className="basis-full text-xs text-red-300">{message}</span>:null}</div>
}
