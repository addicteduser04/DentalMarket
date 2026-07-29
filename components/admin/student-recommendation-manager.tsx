"use client";
import {useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {translate,type Locale} from "@/lib/i18n";

type Row={id:string;display_order:number;is_active:boolean;source_url:string;universities?:{acronym:string};academic_years?:{label_fr:string;label_ar:string};products?:{name:string}};
export function StudentRecommendationManager({initial,locale}:{initial:Row[];locale:Locale}){
  const [rows,setRows]=useState(initial),[filter,setFilter]=useState(""),[notice,setNotice]=useState("");
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  const shown=useMemo(()=>rows.filter(row=>`${row.universities?.acronym} ${row.products?.name}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase())),[rows,filter]);
  async function save(row:Row){
    setNotice("");
    const {error}=await createClient().from("student_recommended_products").update({display_order:row.display_order,is_active:row.is_active}).eq("id",row.id);
    setNotice(error?t("recommendationSaveError"):t("recommendationSaved"));
  }
  return <div><p className="eyebrow">{t("studentCatalogue")}</p><h1 className="display mt-3 text-4xl">{t("recommendationsAdmin")}</h1><p className="mt-3 max-w-3xl text-sm text-white/50">{t("recommendationsAdminIntro")}</p>
    <input className="field mt-7 max-w-lg" value={filter} onChange={event=>setFilter(event.target.value)} placeholder={t("search")}/>
    {notice&&<p className="mt-4 text-sm text-cyan-300">{notice}</p>}
    <div className="mt-6 grid gap-3">{shown.map(row=><div className="card grid items-center gap-4 p-4 md:grid-cols-[1fr_150px_110px_auto]" key={row.id}><div><b>{row.products?.name}</b><p className="mt-1 text-xs text-white/45">{row.universities?.acronym} · {locale==="ar"?row.academic_years?.label_ar:row.academic_years?.label_fr}</p><a href={row.source_url} rel="noreferrer" target="_blank" className="mt-1 block text-xs text-cyan-300">{t("sourcePage")}</a></div><label className="admin-field">{t("displayOrder")}<input type="number" min="0" value={row.display_order} onChange={event=>setRows(current=>current.map(item=>item.id===row.id?{...item,display_order:Number(event.target.value)}:item))}/></label><label className="admin-check"><input type="checkbox" checked={row.is_active} onChange={event=>setRows(current=>current.map(item=>item.id===row.id?{...item,is_active:event.target.checked}:item))}/>{t("visible")}</label><button className="button" onClick={()=>save(row)}>{t("save")}</button></div>)}</div>
  </div>;
}
