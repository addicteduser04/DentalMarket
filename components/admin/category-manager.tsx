"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient,hasSupabaseEnv } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryManager({categories}:{categories:Category[]}){
  const router=useRouter();
  const [message,setMessage]=useState("");

  async function add(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!hasSupabaseEnv){setMessage("Le service de gestion est indisponible.");return}
    const form=event.currentTarget;
    const values=new FormData(form);
    const name=String(values.get("name")).trim();
    const {error}=await createClient().from("categories").insert({
      name,
      slug:slugify(name),
      parent_id:values.get("parent_id")||null,
    });
    if(error){setMessage("Impossible d’ajouter cette catégorie. Vérifiez qu’elle n’existe pas déjà.");return}
    form.reset();
    setMessage("Catégorie ajoutée.");
    router.refresh();
  }

  async function del(id:string){
    if(hasSupabaseEnv&&confirm("Supprimer cette catégorie ?")){
      const {error}=await createClient().from("categories").delete().eq("id",id);
      setMessage(error?"Impossible de supprimer cette catégorie.":"Catégorie supprimée.");
      if(!error)router.refresh();
    }
  }

  return <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]"><div className="card p-3">{categories.map(c=><div key={c.id} className="flex items-center justify-between border-b border-white/10 p-3 last:border-0"><div><b>{c.name}</b><p className="text-xs text-white/40">/{c.slug}{c.parent_id&&` · sous-catégorie`}</p></div><button onClick={()=>del(c.id)} className="text-xs font-bold text-red-300">Supprimer</button></div>)}{!categories.length&&<p className="p-5 text-sm text-white/45">Aucune catégorie enregistrée.</p>}</div><form onSubmit={add} className="card grid h-fit gap-4 p-5"><h2 className="display text-2xl">Ajouter</h2><input required name="name" className="field" placeholder="Nom de la catégorie"/><select name="parent_id" className="field"><option value="">Sans parent</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="button">Ajouter</button>{message&&<p role="status" className="account-feedback">{message}</p>}</form></div>
}
