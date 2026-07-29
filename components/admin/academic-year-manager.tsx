"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {AcademicYear} from "@/lib/student-packs";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

export function AcademicYearManager({initial,locale="fr"}:{initial:AcademicYear[];locale?:Locale}){
 const [rows,setRows]=useState(initial),[message,setMessage]=useState("");
 const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 const change=(index:number,patch:Partial<AcademicYear>)=>setRows(rows.map((row,i)=>i===index?{...row,...patch}:row));
 async function save(row:AcademicYear){const {error}=await createClient().from("academic_years").upsert(row);setMessage(error?t("saveYearError"):t("yearSaved"));}
 return <div>
  <div className="mb-5 flex justify-between"><div><p className="eyebrow">{t("studentPacks")}</p><h1 className="display mt-2 text-4xl">{t("academicYears")}</h1></div><button className="button" onClick={()=>setRows([...rows,{id:crypto.randomUUID(),code:"",label_fr:"",label_ar:"",display_order:rows.length+1,is_active:false}])}>{t("add")}</button></div>
  <div className="grid gap-3">{rows.map((row,index)=><div className="card grid gap-3 p-4 md:grid-cols-6" key={row.id}>
   <input value={row.code} placeholder={t("stableCode")} onChange={e=>change(index,{code:e.target.value})}/>
   <input value={row.label_fr} placeholder={t("frenchLabel")} onChange={e=>change(index,{label_fr:e.target.value})}/>
   <input dir="rtl" value={row.label_ar} placeholder={t("arabicLabel")} onChange={e=>change(index,{label_ar:e.target.value})}/>
   <input aria-label={t("status")} type="number" min="0" value={row.display_order} onChange={e=>change(index,{display_order:Number(e.target.value)})}/>
   <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_active} onChange={e=>change(index,{is_active:e.target.checked})}/>{t("active")}</label>
   <button className="account-button-secondary" onClick={()=>save(row)}>{t("save")}</button>
  </div>)}</div>{message&&<p className="mt-4 text-cyan-300">{message}</p>}
 </div>;
}
