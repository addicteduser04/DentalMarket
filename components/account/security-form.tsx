"use client";
import { AlertTriangle, CheckCircle2, KeyRound, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { passwordStrength } from "@/lib/account-validation";

export function SecurityForm({email,emailVerified,lastSignIn,mustChangePassword}:{email:string;emailVerified:boolean;lastSignIn?:string;mustChangePassword:boolean}) {
  const router=useRouter(),[password,setPassword]=useState(""),[confirmation,setConfirmation]=useState(""),[message,setMessage]=useState("");
  const strength=passwordStrength(password);
  async function changePassword(e:React.FormEvent){e.preventDefault();if(!strength.valid){setMessage("Choisissez un mot de passe plus robuste.");return}if(password!==confirmation){setMessage("Les mots de passe ne correspondent pas.");return}const {error}=await createClient().auth.updateUser({password});setMessage(error?"Impossible de modifier le mot de passe.":"Mot de passe modifié.");if(!error){setPassword("");setConfirmation("")}}
  async function recovery(){const {error}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/account/security`});setMessage(error?"Impossible d’envoyer l’e-mail de récupération.":"E-mail de récupération envoyé.")}
  async function signOut(scope:"local"|"global"){await createClient().auth.signOut({scope});router.push("/account");router.refresh()}
  return <div className="grid gap-5">
    {mustChangePassword&&<div role="alert" className="account-urgent"><AlertTriangle/><div><b>Changement de mot de passe requis</b><p>Ce compte utilise encore un accès temporaire. Définissez immédiatement un nouveau mot de passe.</p></div></div>}
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={changePassword} className="account-panel p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="text-cyan-300"/>Modifier le mot de passe</h2><div className="mt-5 grid gap-4"><label className="account-field">Nouveau mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} autoComplete="new-password"/></label><div><div className="flex gap-1">{[1,2,3,4,5].map(value=><i key={value} className={`h-1.5 flex-1 rounded-full ${strength.score>=value?"bg-cyan-400":"bg-white/10"}`}/>)}</div><p className="mt-2 text-xs text-white/45">Robustesse : {strength.label}. Utilisez au moins 10 caractères.</p></div><label className="account-field">Confirmer<input type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={10} autoComplete="new-password"/></label><button className="account-button">Modifier le mot de passe</button></div></form>
      <section className="account-panel p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="text-cyan-300"/>État de sécurité</h2><div className="mt-5 grid gap-3 text-sm"><p className="flex items-center justify-between rounded-xl bg-white/[.04] p-3"><span>E-mail vérifié</span><b className={emailVerified?"text-cyan-300":"text-amber-300"}>{emailVerified?"Oui":"Non"}</b></p><p className="rounded-xl bg-white/[.04] p-3"><span className="block text-white/45">Dernière connexion</span><b>{lastSignIn?new Date(lastSignIn).toLocaleString("fr-MA"):"Non disponible"}</b></p><p className="rounded-xl bg-white/[.04] p-3"><span className="block text-white/45">Authentification à deux facteurs</span><b>Prête à être activée lorsqu’elle sera configurée</b></p></div><button type="button" onClick={recovery} className="account-button-secondary mt-5"><MailCheck size={16}/>Envoyer un lien de récupération</button></section>
    </div>
    <section className="account-panel p-6"><h2 className="text-lg font-bold">Sessions</h2><p className="mt-2 text-sm text-white/45">Fermez cette session ou toutes les sessions actives de votre compte.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>signOut("local")} className="account-button-secondary"><LogOut size={16}/>Se déconnecter</button><button onClick={()=>signOut("global")} className="account-danger-button"><LogOut size={16}/>Déconnecter toutes les sessions</button></div></section>
    {message&&<p role="status" className="account-feedback"><CheckCircle2 size={18}/>{message}</p>}
  </div>
}
