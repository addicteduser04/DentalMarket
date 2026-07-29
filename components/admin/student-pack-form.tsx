"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import type {Product} from "@/lib/types";
import type {AcademicYear,PackComponent,StudentPack,University} from "@/lib/student-packs";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

type DraftComponent=Partial<PackComponent>&{product_id:string;quantity:number;is_required:boolean;display_order:number};
type Props={pack?:StudentPack;universities:University[];years:AcademicYear[];products:Product[];locale?:Locale};

export function StudentPackForm({pack,universities,years,products,locale="fr"}:Props){
 const router=useRouter(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 const [dirty,setDirty]=useState(false),[message,setMessage]=useState("");
 const [components,setComponents]=useState<DraftComponent[]>((pack?.student_pack_components||[]).map(item=>({...item})));
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault()};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);
 const total=useMemo(()=>components.filter(c=>c.is_required).reduce((sum,c)=>{
  const product=products.find(item=>item.id===c.product_id);
  const variation=product?.variations?.find(item=>item.id===c.variation_id||item.source_id===c.variation_id);
  return sum+Number(variation?.price??product?.promotional_price??product?.price??0)*c.quantity;
 },0),[components,products]);
 const update=(index:number,patch:Partial<DraftComponent>)=>{setComponents(components.map((item,i)=>i===index?{...item,...patch}:item));setDirty(true)};
 const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=components.length)return;const next=[...components];[next[index],next[target]]=[next[target],next[index]];setComponents(next);setDirty(true)};

 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget),status=String(form.get("publication_status"));
  if(status==="published"&&(!components.length||!form.get("university_id")||!form.get("academic_year_id"))){setMessage(t("publicationInvalid"));return}
  const payload={university_id:form.get("university_id"),academic_year_id:form.get("academic_year_id"),name:form.get("name"),slug:form.get("slug"),short_description:form.get("short_description"),description:form.get("description"),image_url:form.get("image_url")||null,pack_code:form.get("pack_code")||null,academic_session:form.get("academic_session")||null,manual_price:form.get("manual_price")===""?null:Number(form.get("manual_price")),component_total:total,promotional_price:form.get("promotional_price")===""?null:Number(form.get("promotional_price")),publication_status:status,is_featured:form.get("is_featured")==="on",availability_strategy:"components"};
  const db=createClient(),response=pack?await db.from("student_packs").update(payload).eq("id",pack.id).select("id").single():await db.from("student_packs").insert(payload).select("id").single();
  if(response.error){setMessage(t("savePackError"));return}
  const id=response.data.id;await db.from("student_pack_components").delete().eq("pack_id",id);
  const rows=components.map((component,index)=>({pack_id:id,product_id:component.product_id,variation_id:component.variation_id||null,quantity:component.quantity,is_required:component.is_required,display_order:index,notes:component.notes||null,replacement_policy:component.replacement_policy||"none"}));
  const inserted=rows.length?await db.from("student_pack_components").insert(rows):{error:null};
  if(inserted.error){setMessage(t("componentInvalid"));return}
  setDirty(false);router.push(`/admin/student-packs/${id}`);router.refresh();setMessage(t("packSaved"));
 }
 async function archive(){if(!pack||!confirm(t("archiveConfirm")))return;await createClient().from("student_packs").update({publication_status:"archived"}).eq("id",pack.id);router.push("/admin/student-packs");router.refresh()}
 async function duplicate(){
  if(!pack)return;const copy={university_id:pack.university_id,academic_year_id:pack.academic_year_id,name:`${pack.name} — ${t("duplicate")}`,slug:`${pack.slug}-copy-${Date.now().toString().slice(-5)}`,short_description:pack.short_description,description:pack.description,image_url:pack.image_url,gallery:pack.gallery,academic_session:pack.academic_session,manual_price:pack.manual_price,component_total:pack.component_total,publication_status:"draft",availability_strategy:pack.availability_strategy,is_featured:false,display_order:pack.display_order};
  const db=createClient(),{data}=await db.from("student_packs").insert(copy).select("id").single();if(!data)return;
  if(components.length)await db.from("student_pack_components").insert(components.map((component,index)=>({pack_id:data.id,product_id:component.product_id,variation_id:component.variation_id||null,quantity:component.quantity,is_required:component.is_required,display_order:index,notes:component.notes||null,replacement_policy:component.replacement_policy||"none"})));
  router.push(`/admin/student-packs/${data.id}`);
 }

 return <form onSubmit={save} onChange={()=>setDirty(true)}>
  <div className="flex flex-wrap justify-between gap-3"><div><p className="eyebrow">{t("studentPacks")}</p><h1 className="display mt-2 text-4xl">{pack?t("editPack"):t("newPack")}</h1></div><div className="flex gap-2">{pack&&<><a target="_blank" href={`/student-packs/${universities.find(item=>item.id===pack.university_id)?.slug}/${pack.slug}`} className="account-button-secondary">{t("publicPreview")}</a><button type="button" className="account-button-secondary" onClick={duplicate}>{t("duplicate")}</button><button type="button" className="account-danger-button" onClick={archive}>{t("archive")}</button></>}<button className="button">{t("save")}</button></div></div>
  <section className="card mt-7 grid gap-4 p-6 md:grid-cols-2">
   <input required name="name" defaultValue={pack?.name} placeholder={t("packName")}/><input required name="slug" defaultValue={pack?.slug} placeholder={t("slug")}/>
   <select required name="university_id" defaultValue={pack?.university_id||""}><option value="">{t("university")}</option>{universities.map(item=><option key={item.id} value={item.id}>{item.acronym} · {item.city}</option>)}</select>
   <select required name="academic_year_id" defaultValue={pack?.academic_year_id||""}><option value="">{t("year")}</option>{years.map(item=><option key={item.id} value={item.id}>{locale==="ar"?item.label_ar:item.label_fr}</option>)}</select>
   <input name="pack_code" defaultValue={pack?.pack_code||""} placeholder={t("packCode")}/><input name="academic_session" defaultValue={pack?.academic_session||""} placeholder={t("sourceSession")}/>
   <input type="number" min="0" step=".01" name="manual_price" defaultValue={pack?.manual_price??""} placeholder={t("normalPrice")}/><input type="number" min="0" step=".01" name="promotional_price" defaultValue={pack?.promotional_price??""} placeholder={t("promotionalPrice")}/>
   <input className="md:col-span-2" name="image_url" defaultValue={pack?.image_url||""} placeholder={t("imageUrl")}/><textarea className="md:col-span-2" name="short_description" defaultValue={pack?.short_description||""} placeholder={t("summary")}/><textarea className="md:col-span-2" rows={5} name="description" defaultValue={pack?.description||""} placeholder={t("description")}/>
   <select name="publication_status" defaultValue={pack?.publication_status||"draft"}><option value="draft">{t("draft")}</option><option value="published">{t("published")}</option><option value="archived">{t("archived")}</option></select><label><input type="checkbox" name="is_featured" defaultChecked={pack?.is_featured}/> {t("featured")}</label>
  </section>
  <section className="card mt-6 p-6"><div className="flex justify-between"><div><h2 className="display text-2xl">{t("components")}</h2><p className="text-sm text-white/45">{t("calculatedTotal")} : {total.toFixed(2)} MAD</p></div><button type="button" className="account-button-secondary" onClick={()=>{setComponents([...components,{product_id:"",quantity:1,is_required:true,display_order:components.length}]);setDirty(true)}}>{t("add")}</button></div>
   <div className="mt-5 grid gap-3">{components.map((component,index)=>{const product=products.find(item=>item.id===component.product_id);return <div className="rounded-xl border border-white/10 p-3" key={component.id||index}><div className="grid gap-2 md:grid-cols-[2fr_1fr_90px_100px_auto]">
    <select required value={component.product_id} onChange={event=>update(index,{product_id:event.target.value,variation_id:null})}><option value="">{t("product")}</option>{products.map(item=><option key={item.id} value={item.id}>{item.name} {item.sku?`· ${item.sku}`:""}</option>)}</select>
    <select value={component.variation_id||""} onChange={event=>update(index,{variation_id:event.target.value||null})}><option value="">{t("noVariation")}</option>{product?.variations?.map(item=><option key={item.id||item.source_id||item.label} value={item.id||item.source_id}>{item.label}</option>)}</select>
    <input aria-label={t("quantity")} type="number" min="1" value={component.quantity} onChange={event=>update(index,{quantity:Number(event.target.value)})}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={component.is_required} onChange={event=>update(index,{is_required:event.target.checked})}/>{t("requiredShort")}</label>
    <button type="button" className="account-danger-button" onClick={()=>{setComponents(components.filter((_,i)=>i!==index));setDirty(true)}}>{t("remove")}</button>
   </div><div className="mt-2 flex justify-end gap-1"><button type="button" disabled={index===0} className="account-button-secondary" onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===components.length-1} className="account-button-secondary" onClick={()=>move(index,1)}>↓</button></div></div>})}</div>
  </section>{message&&<p className="mt-4 text-cyan-300">{message}</p>}
 </form>;
}
