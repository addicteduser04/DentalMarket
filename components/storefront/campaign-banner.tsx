"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight} from "lucide-react";
import {campaignBannerModel} from "@/lib/campaigns";
import type {Campaign} from "@/lib/types";

export function CampaignBanner({campaign}:{campaign:Campaign}){
  const model=campaignBannerModel(campaign),[imageFailed,setImageFailed]=useState(false);
  if(!model)return null;
  const content=<div className="group relative min-h-48 overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/15 to-blue-600/15">
    {model.imageUrl&&!imageFailed?<Image src={model.imageUrl} alt="" fill sizes="(max-width: 1280px) 100vw, 1200px" unoptimized onError={()=>setImageFailed(true)} className="object-cover"/>:null}
    <span className="absolute inset-0 bg-gradient-to-r from-[#07121b]/95 via-[#07121b]/65 to-transparent"/>
    <span className="relative flex min-h-48 items-center justify-between gap-6 px-7 py-8"><span><span className="eyebrow">Offre du moment</span><strong className="display mt-2 block text-3xl">{model.name}</strong></span>{model.href?<ArrowRight className="shrink-0 text-cyan-300 transition group-hover:translate-x-1"/>:null}</span>
  </div>;
  return <section className="py-12"><div className="container-shell">{model.href?<Link href={model.href}>{content}</Link>:content}</div></section>;
}
