"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEmailChange, validateProfile } from "@/lib/account-validation";

type Profile = {
  full_name?:string|null; first_name?:string|null; last_name?:string|null;
  display_name?:string|null; avatar_url?:string|null; phone?:string|null;
  user_type?:string|null; clinic_name?:string|null; preferred_language?:string|null;
};

export function ProfileForm({email,initial}:{email:string;initial:Profile}) {
  const formRef=useRef<HTMLFormElement>(null);
  const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[errors,setErrors]=useState<Record<string,string>>({});
  const [avatar,setAvatar]=useState(initial.avatar_url||"");
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault()};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage("");const form=new FormData(event.currentTarget);
    const profileResult=validateProfile({
      first_name:String(form.get("first_name")||""),last_name:String(form.get("last_name")||""),
      display_name:String(form.get("display_name")||""),phone:String(form.get("phone")||""),
      user_type:String(form.get("user_type")||""),clinic_name:String(form.get("clinic_name")||""),
      preferred_language:String(form.get("preferred_language")||""),
    });
    const emailResult=validateEmailChange(email,String(form.get("email")||""));
    if(!profileResult.valid||!emailResult.valid){setErrors({...profileResult.errors,...(!emailResult.valid?{email:"Adresse e-mail invalide."}:{})});return}
    setErrors({});setSaving(true);const db=createClient();
    const full_name=`${profileResult.data.first_name} ${profileResult.data.last_name}`.trim();
    const {error}=await db.from("profiles").update({...profileResult.data,full_name,avatar_url:avatar||null}).eq("id",(await db.auth.getUser()).data.user?.id);
    if(error){setMessage("Impossible d’enregistrer le profil.");setSaving(false);return}
    if(emailResult.requiresConfirmation){
      const {error:emailError}=await db.auth.updateUser({email:emailResult.email});
      if(emailError){setMessage("Profil enregistré, mais la modification d’e-mail a échoué.");setSaving(false);return}
      setMessage("Profil enregistré. Confirmez les deux adresses e-mail pour finaliser le changement.");
    }else setMessage("Profil enregistré.");
    setDirty(false);setSaving(false);
  }

  async function uploadAvatar(file?:File){
    if(!file)return;if(file.size>2*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Utilisez une image JPEG, PNG ou WebP de moins de 2 Mo.");return}
    setSaving(true);const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user){setSaving(false);return}
    const extension=file.name.split(".").pop()?.toLowerCase()||"jpg",path=`${user.id}/avatar.${extension}`;
    const {error}=await db.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
    if(error){setMessage("Impossible d’envoyer la photo.");setSaving(false);return}
    const {data}=db.storage.from("avatars").getPublicUrl(path);setAvatar(`${data.publicUrl}?v=${Date.now()}`);setDirty(true);setSaving(false);
  }

  const field=(name:string,label:string,type="text")=><label className="account-field">{label}<input name={name} type={type} defaultValue={(initial as Record<string,unknown>)[name] as string||""} onChange={()=>setDirty(true)}/>{errors[name]&&<small role="alert">{errors[name]}</small>}</label>;
  return <form ref={formRef} onSubmit={submit} onChange={()=>setDirty(true)} className="grid gap-5">
    <section className="account-panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-300/25 bg-cyan-300/10 text-2xl font-black">{avatar?<Image src={avatar} alt="Photo de profil" fill className="object-cover"/>:<span>{(initial.display_name||initial.full_name||"DN").slice(0,2).toUpperCase()}</span>}</div>
      <div><h2 className="text-lg font-bold">Photo de profil</h2><p className="mt-1 text-sm text-white/45">JPEG, PNG ou WebP · 2 Mo maximum</p><label className="account-button-secondary mt-4 cursor-pointer"><Camera size={16}/>Choisir une image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadAvatar(e.target.files?.[0])}/></label></div>
    </section>
    <section className="account-panel grid gap-5 p-6 sm:grid-cols-2">
      {field("first_name","Prénom")}
      {field("last_name","Nom")}
      <label className="account-field sm:col-span-2">Nom affiché<input name="display_name" defaultValue={initial.display_name||initial.full_name||""}/>{errors.display_name&&<small role="alert">{errors.display_name}</small>}<span>Ce champ ne détermine jamais vos droits d’accès.</span></label>
      <label className="account-field sm:col-span-2">Adresse e-mail<input name="email" type="email" defaultValue={email}/>{errors.email&&<small role="alert">{errors.email}</small>}<span>Un changement nécessite une confirmation sécurisée par e-mail.</span></label>
      {field("phone","Téléphone","tel")}
      <label className="account-field">Profession<select name="user_type" defaultValue={initial.user_type||"student"}><option value="student">Étudiant(e)</option><option value="professional">Professionnel(le)</option></select><span>La profession ne confère aucun accès administrateur.</span></label>
      {field("clinic_name","Cabinet ou société")}
      <label className="account-field">Langue préférée<select name="preferred_language" defaultValue={initial.preferred_language||"fr"}><option value="fr">Français</option><option value="ar">العربية</option></select></label>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-white/50">{dirty?"Modifications non enregistrées":"Profil à jour"}</p><button disabled={saving} className="account-button">{saving?<Loader2 className="animate-spin" size={17}/>:<Save size={17}/>}Enregistrer</button></div>
    {message&&<p role="status" className="account-feedback"><CheckCircle2 size={18}/>{message}</p>}
  </form>
}
