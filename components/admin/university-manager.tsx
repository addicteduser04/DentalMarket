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
    <div className="grid gap-5">{rows.map((row,index)=><div className="card grid gap-4 p-5 md:grid-cols-3" key={row.id}>
      <label className="admin-field">{t("fullName")}<input value={row.name} onChange={e=>change(index,{name:e.target.value})}/></label>
      <label className="admin-field">{t("acronym")}<input value={row.acronym} onChange={e=>change(index,{acronym:e.target.value})}/></label>
      <label className="admin-field">{t("city")}<input value={row.city} onChange={e=>change(index,{city:e.target.value})}/></label>
      <label className="admin-field">{t("slug")}<input value={row.slug} onChange={e=>change(index,{slug:e.target.value})}/></label>
      <label className="admin-field md:col-span-2">{t("logoUrl")}<input value={row.image_url||""} onChange={e=>change(index,{image_url:e.target.value})}/></label>
      <label className="admin-field md:col-span-3">{t("description")}<textarea rows={2} value={row.description||""} onChange={e=>change(index,{description:e.target.value})}/></label>
      <div className="flex items-center justify-between border-t border-white/10 pt-4 md:col-span-3">
        <label className="admin-check"><input type="checkbox" checked={row.is_active} onChange={e=>change(index,{is_active:e.target.checked})}/>{t("active")}</label>
        <button className="account-button-secondary" onClick={()=>save(row)}>{t("save")}</button>
      </div>
    </div>)}</div>
    {message&&<p className="mt-4 text-sm text-cyan-300">{message}</p>}
  </div>;
}
