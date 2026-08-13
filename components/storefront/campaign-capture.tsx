"use client";
import {usePathname,useSearchParams} from "next/navigation";
import {useEffect} from "react";
import {captureCampaignRef} from "@/lib/campaigns";
import {createClient,hasSupabaseEnv} from "@/lib/supabase/client";

export function CampaignCapture(){
  const params=useSearchParams(),pathname=usePathname(),slug=params.get("ref");
  useEffect(()=>{
    if(pathname.startsWith("/admin")||!slug||!hasSupabaseEnv)return;
    void captureCampaignRef(slug,async value=>{
      const now=new Date().toISOString(),{data,error}=await createClient().from("campaigns").select("id").eq("slug",value).eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
      return !error&&Boolean(data);
    },localStorage).catch(()=>undefined);
  },[pathname,slug]);
  return null;
}
