"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import type {Campaign} from "@/lib/types";

export function CampaignActions({campaign}:{campaign:Campaign}){
  const [message,setMessage]=useState(""),router=useRouter();
  async function toggle(){setMessage("");const {error}=await createClient().from("campaigns").update({is_active:!campaign.is_active}).eq("id",campaign.id);if(error){setMessage("Impossible de modifier l’état de la campagne.");return}router.refresh()}
  async function remove(){if(!window.confirm("Supprimer définitivement cette campagne ?"))return;setMessage("");const {error}=await createClient().from("campaigns").delete().eq("id",campaign.id);if(error){setMessage("Impossible de supprimer la campagne.");return}router.refresh()}
  return <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/campaigns/${campaign.id}/edit`} className="text-cyan-300 hover:underline">Modifier</Link><button type="button" onClick={toggle} className="text-amber-300 hover:underline">{campaign.is_active?"Désactiver":"Activer"}</button><button type="button" onClick={remove} className="text-red-300 hover:underline">Supprimer</button>{message?<span className="basis-full text-xs text-red-300">{message}</span>:null}</div>
}
