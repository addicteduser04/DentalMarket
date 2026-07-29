"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {University} from "@/lib/student-packs";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

export function UniversityManager({initial,locale="fr"}:{initial:University[];locale?:Locale}){
  const [rows,setRows]=useState(initial),[message,setMessage]=useState("");
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  const change=(index:number,patch:Partial<University>)=>setRows(rows.map((row,i)=>i===index?{...row,...patch}:row));
  async function save(row:University){
    const {error}=await createClient().from("universities").upsert(row);
    setMessage(error?t("saveUniversityError"):t("universitySaved"));
  }
  return <div>
    <div className="mb-5 flex justify-between"><div><p className="eyebrow">{t("studentPacks")}</p><h1 className="display mt-2 text-4xl">{t("universities")}</h1></div>
      <button className="button" onClick={()=>setRows([...rows,{id:crypto.randomUUID(),name:"",acronym:"",city:"",slug:"",display_order:rows.length,is_active:false}])}>{t("add")}</button>
    </div>
    <div className="grid gap-3">{rows.map((row,index)=><div className="card grid gap-3 p-4 md:grid-cols-6" key={row.id}>
      <input aria-label={t("fullName")} placeholder={t("fullName")} value={row.name} onChange={e=>change(index,{name:e.target.value})}/>
      <input aria-label={t("acronym")} placeholder={t("acronym")} value={row.acronym} onChange={e=>change(index,{acronym:e.target.value})}/>
      <input aria-label={t("city")} placeholder={t("city")} value={row.city} onChange={e=>change(index,{city:e.target.value})}/>
      <input aria-label={t("slug")} placeholder={t("slug")} value={row.slug} onChange={e=>change(index,{slug:e.target.value})}/>
      <input className="md:col-span-2" aria-label={t("logoUrl")} placeholder={t("logoUrl")} value={row.image_url||""} onChange={e=>change(index,{image_url:e.target.value})}/>
      <textarea className="md:col-span-3" aria-label={t("description")} placeholder={t("description")} value={row.description||""} onChange={e=>change(index,{description:e.target.value})}/>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.is_active} onChange={e=>change(index,{is_active:e.target.checked})}/>{t("active")}</label>
      <button className="account-button-secondary" onClick={()=>save(row)}>{t("save")}</button>
    </div>)}</div>
    {message&&<p className="mt-4 text-sm text-cyan-300">{message}</p>}
  </div>;
}
