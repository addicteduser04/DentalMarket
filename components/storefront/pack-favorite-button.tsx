"use client";
import {Heart} from "lucide-react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";
export function PackFavoriteButton({packId,locale="fr"}:{packId:string;locale?:Locale}){
 const [active,setActive]=useState(false),[userId,setUserId]=useState<string>();
 useEffect(()=>{(async()=>{const db=createClient(),user=(await db.auth.getUser()).data.user;if(!user)return;setUserId(user.id);const {data}=await db.from("student_pack_favorites").select("pack_id").eq("user_id",user.id).eq("pack_id",packId).maybeSingle();setActive(Boolean(data))})()},[packId]);
 async function toggle(){if(!userId){window.location.href="/account";return}const db=createClient();if(active)await db.from("student_pack_favorites").delete().eq("user_id",userId).eq("pack_id",packId);else await db.from("student_pack_favorites").insert({user_id:userId,pack_id:packId});setActive(!active)}
 return <button onClick={toggle} aria-label={translate(locale,active?"removeFavorite":"addFavorite")} className="grid h-11 w-11 place-items-center rounded-full border border-white/15"><Heart className={active?"fill-cyan-300 text-cyan-300":""}/></button>;
}
