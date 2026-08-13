"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient,hasSupabaseEnv } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";
import {categoryMutationError,validateCategoryDraft,type CategoryDraft} from "@/lib/category-management";

export function CategoryManager({categories}:{categories:Category[]}){
  const router=useRouter();
  const [message,setMessage]=useState("");
  const [editing,setEditing]=useState<(CategoryDraft&{id:string})|null>(null);
  const roots=categories.filter(category=>!category.parent_id);

  async function add(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!hasSupabaseEnv){setMessage("Le service de gestion est indisponible.");return}
    const form=event.currentTarget;
    const values=new FormData(form);
    const name=String(values.get("name")).trim();
    const validation=validateCategoryDraft(categories,null,{name,slug:slugify(name),parent_id:String(values.get("parent_id")||"")||null});
    if(!validation.valid){setMessage(validation.error);return}
    const {error}=await createClient().from("categories").insert({
      ...validation.data,
    });
    if(error){setMessage(categoryMutationError("ajouter",error.code));return}
    form.reset();
    setMessage("Catégorie ajoutée.");
    router.refresh();
  }

  async function del(id:string){
    if(hasSupabaseEnv&&confirm("Supprimer cette catégorie ?")){
      const {error}=await createClient().from("categories").delete().eq("id",id);
      setMessage(error?categoryMutationError("supprimer",error.code):"Catégorie supprimée.");
      if(!error)router.refresh();
    }
  }

  function startEdit(category:Category){
    setMessage("");
    setEditing({id:category.id,name:category.name,slug:category.slug,parent_id:category.parent_id||null});
  }

  function cancelEdit(){setEditing(null);setMessage("")}

  async function saveEdit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!editing||!hasSupabaseEnv){setMessage("Le service de gestion est indisponible.");return}
    const validation=validateCategoryDraft(categories,editing.id,editing);
    if(!validation.valid){setMessage(validation.error);return}
    const {error}=await createClient().from("categories").update(validation.data).eq("id",editing.id);
    if(error){setMessage(categoryMutationError("modifier",error.code));return}
    setEditing(null);
    setMessage("Catégorie modifiée.");
    router.refresh();
  }

  return <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]"><div className="card p-3">{categories.map(c=>editing?.id===c.id?<form key={c.id} onSubmit={saveEdit} className="grid gap-3 border-b border-white/10 p-3 last:border-0"><div className="grid gap-3 md:grid-cols-2"><label className="admin-field">Nom<input required value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})}/></label><label className="admin-field">Slug<input required value={editing.slug} onChange={event=>setEditing({...editing,slug:event.target.value})}/></label></div><label className="admin-field">Catégorie parente<select value={editing.parent_id||""} onChange={event=>setEditing({...editing,parent_id:event.target.value||null})}><option value="">Sans parent</option>{roots.filter(root=>root.id!==editing.id).map(root=><option key={root.id} value={root.id}>{root.name}</option>)}</select></label><div className="flex gap-3"><button type="submit" className="account-button">Enregistrer</button><button type="button" onClick={cancelEdit} className="account-button-secondary">Annuler</button></div></form>:<div key={c.id} className="flex items-center justify-between gap-4 border-b border-white/10 p-3 last:border-0"><div><b>{c.name}</b><p className="text-xs text-white/40">/{c.slug}{c.parent_id&&` · sous-catégorie`}</p></div><div className="flex gap-3"><button type="button" onClick={()=>startEdit(c)} className="text-xs font-bold text-cyan-300">Modifier</button><button type="button" onClick={()=>del(c.id)} className="text-xs font-bold text-red-300">Supprimer</button></div></div>)}{!categories.length&&<p className="p-5 text-sm text-white/45">Aucune catégorie enregistrée.</p>}</div><form onSubmit={add} className="card grid h-fit gap-4 p-5"><h2 className="display text-2xl">Ajouter</h2><input required name="name" className="field" placeholder="Nom de la catégorie"/><select name="parent_id" className="field"><option value="">Sans parent</option>{roots.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="submit" className="button">Ajouter</button>{message&&<p role="status" className="account-feedback">{message}</p>}</form></div>
}
