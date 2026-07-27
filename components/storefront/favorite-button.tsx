"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FavoriteButton({productId,className=""}:{productId:string;className?:string}) {
  const [favorite,setFavorite]=useState(false),[loading,setLoading]=useState(true),router=useRouter();
  useEffect(()=>{let active=true;(async()=>{const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user){if(active)setLoading(false);return}const {data}=await db.from("favorites").select("product_id").eq("user_id",user.id).eq("product_id",productId).maybeSingle();if(active){setFavorite(Boolean(data));setLoading(false)}})();return()=>{active=false}},[productId]);
  async function toggle(){
    const db=createClient(),{data:{user}}=await db.auth.getUser();
    if(!user){router.push(`/account?next=${encodeURIComponent(window.location.pathname)}`);return}
    setLoading(true);
    const result=favorite
      ?await db.from("favorites").delete().eq("user_id",user.id).eq("product_id",productId)
      :await db.from("favorites").upsert({user_id:user.id,product_id:productId},{onConflict:"user_id,product_id"});
    if(!result.error)setFavorite(!favorite);setLoading(false);router.refresh();
  }
  return <button type="button" disabled={loading} onClick={toggle} aria-label={favorite?"Retirer des favoris":"Ajouter aux favoris"} aria-pressed={favorite} className={`favorite-button ${favorite?"is-favorite":""} ${className}`}><Heart size={18} fill={favorite?"currentColor":"none"}/></button>
}
