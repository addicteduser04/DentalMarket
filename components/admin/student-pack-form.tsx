"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {Archive,ArrowDown,ArrowUp,CheckCircle2,Copy,ExternalLink,GripVertical,ImagePlus,Loader2,PackagePlus,Save,Trash2,X} from "lucide-react";
import {createClient,hasSupabaseEnv} from "@/lib/supabase/client";
import type {Product} from "@/lib/types";
import type {AcademicYear,PackComponent,StudentPack,University} from "@/lib/student-packs";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";
import { normalizeComponents } from "@/lib/pack-component-identity.js";
import {isPublicImageUrl} from "@/lib/image-url";
import {validateProductImage} from "@/lib/product-validation";

type DraftComponent=Partial<PackComponent>&{product_id:string;quantity:number;is_required:boolean;display_order:number;source_bundle_item_id?:string|null;source_metadata?:any;price_snapshot?:number|null};
type Props={pack?:StudentPack;universities:University[];years:AcademicYear[];products:Product[];locale?:Locale};

export function StudentPackForm({pack,universities,years,products,locale="fr"}:Props){
 const router=useRouter(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 const [dirty,setDirty]=useState(false),[message,setMessage]=useState(""),[uploading,setUploading]=useState(false),[saving,setSaving]=useState(false);
 const [imageUrl,setImageUrl]=useState(pack?.image_url||"");
 const [components,setComponents]=useState<DraftComponent[]>((pack?.student_pack_components||[]).map(item=>({...item})));
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault()};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);
 const total=useMemo(()=>components.filter(c=>c.is_required).reduce((sum,c)=>{
  const product=products.find(item=>item.id===c.product_id);
  const variation=product?.variations?.find(item=>item.id===c.variation_id||item.source_id===c.variation_id);
  return sum+Number(variation?.price??product?.promotional_price??product?.price??0)*c.quantity;
 },0),[components,products]);
 const update=(index:number,patch:Partial<DraftComponent>)=>{setComponents(components.map((item,i)=>i===index?{...item,...patch}:item));setDirty(true)};
 const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=components.length)return;const next=[...components];[next[index],next[target]]=[next[target],next[index]];setComponents(next);setDirty(true)};

 async function uploadImage(files:FileList|null){
  const file=files?.[0];if(!file||!hasSupabaseEnv)return;setMessage("");
  const invalid=validateProductImage(file);if(invalid){setMessage(invalid);return}
  setUploading(true);const db=createClient(),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
  const path=`student-packs/${pack?.id||"draft"}/${crypto.randomUUID()}-${safe}`;
  const {error}=await db.storage.from("product-images").upload(path,file,{contentType:file.type});
  if(error)setMessage("Impossible d’envoyer l’image. Réessayez ou vérifiez le format du fichier.");
  else {setImageUrl(db.storage.from("product-images").getPublicUrl(path).data.publicUrl);setDirty(true)}
  setUploading(false);
 }

 async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget),status=String(form.get("publication_status"));
    if(status==="published"&&(!components.length||!form.get("university_id")||!form.get("academic_year_id"))){setMessage(t("publicationInvalid"));return}
    const payload={university_id:form.get("university_id"),academic_year_id:form.get("academic_year_id"),name:form.get("name"),slug:form.get("slug"),short_description:form.get("short_description"),description:form.get("description"),image_url:form.get("image_url")||null,pack_code:form.get("pack_code")||null,academic_session:form.get("academic_session")||null,manual_price:form.get("manual_price")===""?null:Number(form.get("manual_price")),component_total:total,promotional_price:form.get("promotional_price")===""?null:Number(form.get("promotional_price")),publication_status:status,is_featured:form.get("is_featured")==="on",availability_strategy:"manual",availability_override:"in_stock"};
    const db=createClient();
    setSaving(true);
    try{
        const rows=components.map((component,index)=>({product_id:component.product_id,variation_id:component.variation_id||null,quantity:component.quantity,is_required:component.is_required,display_order:index,notes:component.notes||null,replacement_policy:component.replacement_policy||"none",source_bundle_item_id:component.source_bundle_item_id||null,price_snapshot:component.price_snapshot||null,source_metadata:component.source_metadata||{}}));
        const {normalized,conflicts} = normalizeComponents(rows as any);
        if(conflicts.length){ setMessage(t("componentInvalid") + " — duplicate conflicts detected"); return }
        const rpcRes = await db.rpc("save_student_pack",{v_pack:pack?.id||null,v_pack_data:payload,v_components:normalized});
        if(rpcRes.error){
            setMessage(rpcRes.error.message || t("componentInvalid"));
            return;
        }
        const id=rpcRes.data as string;
        setDirty(false);router.push(`/admin/student-packs/${id}`);router.refresh();setMessage(t("packSaved"));
    } finally { setSaving(false) }
 }
 async function archive(){if(!pack||!confirm(t("archiveConfirm")))return;await createClient().from("student_packs").update({publication_status:"archived"}).eq("id",pack.id);router.push("/admin/student-packs");router.refresh()}
 async function duplicate(){
  if(!pack)return;const copy={university_id:pack.university_id,academic_year_id:pack.academic_year_id,name:`${pack.name} — ${t("duplicate")}`,slug:`${pack.slug}-copy-${Date.now().toString().slice(-5)}`,short_description:pack.short_description,description:pack.description,image_url:pack.image_url,gallery:pack.gallery,academic_session:pack.academic_session,manual_price:pack.manual_price,component_total:pack.component_total,publication_status:"draft",availability_strategy:"manual",availability_override:"in_stock",is_featured:false,display_order:pack.display_order};
    const rows = components.map((component,index)=>({product_id:component.product_id,variation_id:component.variation_id||null,quantity:component.quantity,is_required:component.is_required,display_order:index,notes:component.notes||null,replacement_policy:component.replacement_policy||"none",source_bundle_item_id:component.source_bundle_item_id||null,price_snapshot:component.price_snapshot||null,source_metadata:component.source_metadata||{}}));
    const {normalized,conflicts} = normalizeComponents(rows as any);
    if(conflicts.length){ setMessage(t("componentInvalid") + " — duplicate conflicts in source pack; copy aborted"); return }
    const {data,error}=await createClient().rpc("save_student_pack",{v_pack:null,v_pack_data:copy,v_components:normalized});
    if(error||!data){setMessage(error?.message||t("savePackError"));return}
    router.push(`/admin/student-packs/${data}`);
 }

 const field=(name:string,label:string,value:unknown="",type="text",required=false)=><label className="admin-field">{label}<input required={required} min={type==="number"?0:undefined} step={type==="number"?".01":undefined} name={name} type={type} defaultValue={(value??"") as string|number}/></label>;
 const publicHref=pack?`/student-packs/${universities.find(item=>item.id===pack.university_id)?.slug}/${pack.slug}`:"";
 const previewImage=isPublicImageUrl(imageUrl)?imageUrl:null;
 return <div>
  <header className="mb-7"><div className="text-xs text-white/40"><Link href="/admin">Administration</Link> <span>/</span> <Link href="/admin/student-packs">{t("studentPacks")}</Link> <span>/</span> <b className="text-white">{pack?.name||t("newPack")}</b></div><div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="eyebrow">{t("studentCatalogue")}</p><h1 className="display mt-1 text-3xl md:text-4xl">{pack?t("editPack"):t("newPack")}</h1><div className="mt-3 flex flex-wrap gap-2"><span className="account-badge">{t((pack?.publication_status||"draft") as "draft"|"published"|"archived")}</span><span className="status-success rounded-full px-3 py-1 text-xs font-bold"><CheckCircle2 className="mr-1 inline" size={13}/>{t("inStock")}</span>{pack?.pack_code&&<span className="text-xs text-white/40">{pack.pack_code}</span>}</div></div><div className="flex flex-wrap gap-2">{pack&&<><a target="_blank" rel="noreferrer" href={publicHref} className="account-button-secondary"><ExternalLink size={16}/>{t("publicPreview")}</a><button type="button" className="account-button-secondary" onClick={duplicate} disabled={saving}><Copy size={16}/>{t("duplicate")}</button><button type="button" className="account-danger-button" onClick={archive}><Archive size={16}/>{t("archive")}</button></>}<button form="student-pack-editor" className="account-button" disabled={saving}><Save size={17}/>{t("save")}</button></div></div></header>
  <form id="student-pack-editor" onSubmit={save} onChange={()=>setDirty(true)} className="product-editor-layout">
   <div className="product-editor-main">
    <Section title="Informations générales"><div className="grid gap-4 md:grid-cols-2">{field("name",t("packName"),pack?.name,"text",true)}{field("slug",t("slug"),pack?.slug,"text",true)}<label className="admin-field">{t("university")}<select required name="university_id" defaultValue={pack?.university_id||""}><option value="">—</option>{universities.map(item=><option key={item.id} value={item.id}>{item.acronym} · {item.city}</option>)}</select></label><label className="admin-field">{t("year")}<select required name="academic_year_id" defaultValue={pack?.academic_year_id||""}><option value="">—</option>{years.map(item=><option key={item.id} value={item.id}>{locale==="ar"?item.label_ar:item.label_fr}</option>)}</select></label>{field("pack_code",t("packCode"),pack?.pack_code)}{field("academic_session",t("sourceSession"),pack?.academic_session)}</div><label className="admin-field mt-4">{t("summary")}<textarea name="short_description" rows={3} defaultValue={pack?.short_description||""}/></label><label className="admin-field mt-4">{t("description")}<textarea name="description" rows={7} defaultValue={pack?.description||""}/></label></Section>
    <Section title={t("components")}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-white/45">{components.length} {t("components").toLowerCase()}</p><p className="mt-1 font-bold text-cyan-300">{t("calculatedTotal")} · {total.toFixed(2)} MAD</p></div><button type="button" className="account-button-secondary" onClick={()=>{setComponents([...components,{product_id:"",quantity:1,is_required:true,display_order:components.length}]);setDirty(true)}}><PackagePlus size={16}/>{t("add")}</button></div>
     <div className="mt-5 grid gap-3">{components.map((component,index)=>{const product=products.find(item=>item.id===component.product_id);return <article className="rounded-2xl border border-white/10 bg-white/[.025] p-4" key={component.id||index}><div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-white/40"><GripVertical size={15}/>#{index+1}</span><div className="flex gap-1"><button aria-label="Monter" type="button" disabled={index===0} className="admin-icon-button disabled:opacity-25" onClick={()=>move(index,-1)}><ArrowUp size={15}/></button><button aria-label="Descendre" type="button" disabled={index===components.length-1} className="admin-icon-button disabled:opacity-25" onClick={()=>move(index,1)}><ArrowDown size={15}/></button><button aria-label={t("remove")} type="button" className="admin-icon-button danger" onClick={()=>{setComponents(components.filter((_,i)=>i!==index));setDirty(true)}}><Trash2 size={15}/></button></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1.2fr_100px]"> <label className="admin-field">{t("product")}<select required value={component.product_id} onChange={event=>update(index,{product_id:event.target.value,variation_id:null})}><option value="">—</option>{products.map(item=><option key={item.id} value={item.id}>{item.name} {item.sku?`· ${item.sku}`:""}</option>)}</select></label><label className="admin-field">{t("noVariation")}<select value={component.variation_id||""} onChange={event=>update(index,{variation_id:event.target.value||null})}><option value="">{t("noVariation")}</option>{product?.variations?.map(item=><option key={item.id||item.source_id||item.label} value={item.id||item.source_id}>{item.label}</option>)}</select></label><label className="admin-field">{t("quantity")}<input type="number" min="1" value={component.quantity} onChange={event=>update(index,{quantity:Number(event.target.value)})}/></label></div><label className="admin-check"><input type="checkbox" checked={component.is_required} onChange={event=>update(index,{is_required:event.target.checked})}/>{t("requiredShort")}</label></article>})}{!components.length&&<div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">{t("components")} — {t("add")}</div>}</div>
    </Section>
   </div>
   <aside className="product-editor-sidebar">
    <Section title={t("status")}><label className="admin-field">{t("status")}<select name="publication_status" defaultValue={pack?.publication_status||"draft"}><option value="draft">{t("draft")}</option><option value="published">{t("published")}</option><option value="archived">{t("archived")}</option></select></label><label className="admin-check"><input type="checkbox" name="is_featured" defaultChecked={pack?.is_featured}/>{t("featured")}</label><div className="status-success mt-5 rounded-xl p-3 text-sm"><b className="flex items-center gap-2"><CheckCircle2 size={16}/>{t("inStock")}</b><p className="mt-1 text-xs opacity-75">Tous les packs étudiants restent disponibles à la commande.</p></div></Section>
    <Section title={t("price")}><div className="grid gap-4">{field("manual_price",`${t("normalPrice")} · MAD`,pack?.manual_price,"number")}{field("promotional_price",`${t("promotionalPrice")} · MAD`,pack?.promotional_price,"number")}</div><p className="mt-4 rounded-xl bg-white/[.04] p-3 text-sm">{t("calculatedTotal")} : <b className="text-cyan-300">{total.toFixed(2)} MAD</b></p></Section>
    <Section title="Image"><label className="admin-upload"><ImagePlus/><b>{uploading?"Envoi en cours…":"Choisir une image sur l’ordinateur"}</b><span>JPEG, PNG ou WebP · 5 Mo maximum</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{void uploadImage(event.target.files);event.target.value=""}} disabled={uploading}/></label><label className="admin-field mt-4">{t("imageUrl")}<input name="image_url" value={imageUrl} onChange={event=>{setImageUrl(event.target.value);setDirty(true)}} placeholder="https://…"/></label>{uploading&&<p className="mt-3 flex items-center gap-2 text-xs text-cyan-300"><Loader2 className="animate-spin" size={14}/>Téléversement de l’image…</p>}{previewImage?<div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/[.04]"><Image src={previewImage} alt={pack?.name||t("studentPacks")} fill sizes="320px" className="object-cover"/><button type="button" aria-label="Retirer l’image" onClick={()=>{setImageUrl("");setDirty(true)}} className="admin-icon-button danger absolute right-2 top-2 bg-[#091018]/90"><X size={15}/></button></div>:imageUrl?<p className="status-warning mt-4 rounded-xl p-3 text-xs">Cette image pointe vers un fichier local et ne peut pas être affichée en ligne. Choisissez un fichier ci-dessus pour l’importer.</p>:null}</Section>
   </aside>
  </form>
  {message&&<div role="status" className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl p-4 shadow-2xl ${message.includes("Impossible")?"status-error":"status-success"}`}>{message}</div>}
    {dirty&&<div className="sticky bottom-4 z-30 mx-auto mt-6 flex max-w-md items-center justify-between rounded-full border border-amber-300/20 bg-[var(--dn-warning-surface)] px-5 py-3 text-sm shadow-2xl backdrop-blur"><span>Modifications non enregistrées</span><button form="student-pack-editor" className="font-bold text-cyan-300" disabled={saving}>{t("save")}</button></div>}
 </div>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="card product-editor-section p-5 md:p-6"><h2 className="text-lg font-black">{title}</h2><div className="mt-5 min-w-0">{children}</div></section>}
