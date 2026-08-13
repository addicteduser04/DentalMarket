"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {campaignMutationError,validateCampaignDraft,type CampaignDraft} from "@/lib/campaigns";
import {createClient,hasSupabaseEnv} from "@/lib/supabase/client";
import type {Campaign,Offer} from "@/lib/types";

function datetime(value?:string|null){return value?value.slice(0,16):""}
export function CampaignForm({offers,campaigns,campaign}:{offers:Offer[];campaigns:Campaign[];campaign?:Campaign}){
  const [msg,setMsg]=useState(""),[errors,setErrors]=useState<Partial<Record<keyof CampaignDraft,string>>>({}),router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setMsg("");
    if(!hasSupabaseEnv){setMsg("Connectez Supabase pour enregistrer.");return}
    const f=new FormData(e.currentTarget),file=f.get("banner") as File;let bannerImageUrl=String(f.get("banner_image_url")??"")||null;
    if(file?.size){const db=createClient(),path=`campaigns/${crypto.randomUUID()}-${file.name}`,{error}=await db.storage.from("product-images").upload(path,file);if(error){setMsg("Impossible de téléverser la bannière.");return}bannerImageUrl=db.storage.from("product-images").getPublicUrl(path).data.publicUrl}
    const result=validateCampaignDraft({name:String(f.get("name")??""),slug:String(f.get("slug")??""),banner_image_url:bannerImageUrl,banner_link:String(f.get("banner_link")??"")||null,offer_id:String(f.get("offer_id")??"")||null,starts_at:String(f.get("starts_at")??""),ends_at:String(f.get("ends_at")??"")||null,is_active:f.has("is_active")},campaigns,offers,campaign?.id);
    setErrors(result.errors);if(!result.valid)return;
    const query=createClient().from("campaigns"),{error}=campaign?await query.update(result.data).eq("id",campaign.id):await query.insert(result.data);
    if(error){setMsg(campaignMutationError(error));return}router.push("/admin/campaigns");router.refresh();
  }
  const error=(key:keyof CampaignDraft)=>errors[key]?<p className="mt-1 text-xs text-red-300">{errors[key]}</p>:null;
  return <form onSubmit={submit} className="card mt-7 grid gap-5 p-6"><div className="grid gap-5 md:grid-cols-2">
    <label className="text-sm font-bold">Nom<input required name="name" defaultValue={campaign?.name} className="field mt-2"/>{error("name")}</label>
    <label className="text-sm font-bold">Slug<input name="slug" defaultValue={campaign?.slug} className="field mt-2" placeholder="automatique si vide"/>{error("slug")}</label>
    <label className="text-sm font-bold">Lien cible (optionnel)<input name="banner_link" defaultValue={campaign?.banner_link??""} className="field mt-2" placeholder="/search"/></label>
    <label className="text-sm font-bold">URL actuelle de bannière<input name="banner_image_url" defaultValue={campaign?.banner_image_url??""} className="field mt-2" placeholder="https://…"/>{error("banner_image_url")}</label>
    <label className="text-sm font-bold">Remplacer la bannière<input type="file" name="banner" accept="image/*" className="field mt-2"/></label>
    <label className="text-sm font-bold">Offre liée (optionnelle)<select name="offer_id" defaultValue={campaign?.offer_id??""} className="field mt-2"><option value="">Aucune</option>{offers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>{error("offer_id")}</label>
    <label className="text-sm font-bold">Début<input required type="datetime-local" name="starts_at" defaultValue={datetime(campaign?.starts_at)||datetime(new Date().toISOString())} className="field mt-2"/>{error("starts_at")}</label>
    <label className="text-sm font-bold">Fin (optionnelle)<input type="datetime-local" name="ends_at" defaultValue={datetime(campaign?.ends_at)} className="field mt-2"/>{error("ends_at")}</label>
    <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="is_active" defaultChecked={campaign?.is_active??true}/> Campagne active</label>
  </div><div className="flex gap-3"><button type="submit" className="button">{campaign?"Enregistrer":"Créer la campagne"}</button><Link href="/admin/campaigns" className="button bg-white/10">Annuler</Link></div>{msg?<p className="text-sm text-red-300">{msg}</p>:null}</form>
}
