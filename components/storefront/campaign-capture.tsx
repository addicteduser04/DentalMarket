"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
export function CampaignCapture(){const params=useSearchParams(); useEffect(()=>{const slug=params.get("ref"); if(slug){/* Attribution intentionally persists until the next campaign overwrites it. */ localStorage.setItem("active_campaign_slug",slug)}},[params]); return null}
