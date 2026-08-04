import { AuthForm } from "@/components/account/auth-form";
import Link from "next/link";
import { ArrowRight, BookHeart, CalendarDays, CheckCircle2, ClipboardList, LockKeyhole, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AccountShell } from "@/components/account/account-shell";
import { getAccountSession } from "@/lib/account-server";

export default async function AccountPage(){
  const {db,user,profile,isAdmin}=await getAccountSession();
  if(!user||!db)return <div className="account-center min-h-[calc(100vh-5rem)]"><div className="container-shell grid gap-10 py-16 lg:grid-cols-2 lg:items-center"><div><BrandLogo inverted/><p className="mt-8 text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">Espace personnel sécurisé</p><h1 className="mt-3 max-w-lg text-5xl font-black tracking-[-.05em] text-white md:text-6xl">Votre pratique, organisée.</h1><p className="mt-5 max-w-md leading-7 text-white/55">Retrouvez vos favoris, demandes et informations de livraison DENTANOVA.</p></div><AuthForm/></div></div>;
  const [{count:favorites},{data:requests},{data:address}]=await Promise.all([
    db.from("favorites").select("*",{count:"exact",head:true}),
    db.from("cart_submissions").select("id,status,created_at,estimated_total").order("created_at",{ascending:false}).limit(3),
    db.from("delivery_addresses").select("district,address_line").eq("is_default",true).maybeSingle(),
  ]);
  const name=profile?.display_name||profile?.full_name||user.email?.split("@")[0]||"Compte DENTANOVA";
  const initials=name.split(/\s+/).slice(0,2).map((part:string)=>part[0]).join("").toUpperCase();
  return <AccountShell isAdmin={isAdmin} title="Vue d’ensemble">
    <section className="account-panel flex flex-col gap-6 p-6 md:flex-row md:items-center">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-300/25 bg-cyan-300/10 text-2xl font-black text-cyan-300">{initials}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-black">{name}</h2>{isAdmin&&<span className="account-badge"><ShieldCheck size={14}/> Administrateur</span>}</div><p className="mt-1 text-white/55">{user.email}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/50"><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-cyan-300"/>{user.email_confirmed_at?"E-mail vérifié":"E-mail à vérifier"}</span><span className="flex items-center gap-2"><CalendarDays size={15}/>Membre depuis {new Date(profile?.created_at||user.created_at).toLocaleDateString("fr-MA")}</span></div></div>
      <Link href="/account/profile" className="account-button-secondary">Modifier le profil <ArrowRight size={16}/></Link>
    </section>
    {isAdmin&&<section className="account-admin-card mt-5 p-6"><span className="account-badge"><ShieldCheck size={14}/> Accès vérifié</span><h2 className="mt-4 text-2xl font-black">Espace administrateur</h2><p className="mt-2 text-sm text-white/55">Gérez le catalogue, les offres et les demandes depuis le tableau de bord sécurisé.</p><Link href="/admin" className="account-button mt-5">Ouvrir l’administration <ArrowRight size={16}/></Link></section>}
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <OverviewCard href="/account/favorites" icon={<BookHeart/>} label="Favoris" value={String(favorites||0)} detail="Produits enregistrés"/>
      <OverviewCard href="/account/orders" icon={<ClipboardList/>} label="Demandes" value={String(requests?.length||0)} detail="Activité récente"/>
      <OverviewCard href="/account/delivery" icon={<MapPin/>} label="Livraison" value={address?.district||"À compléter"} detail="Livraison partout au Maroc"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <section className="account-panel p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardList className="text-cyan-300" size={19}/>Demandes récentes</h2>{requests?.length?<div className="mt-4 grid gap-2">{requests.map(row=><Link href="/account/orders" key={row.id} className="flex items-center justify-between rounded-xl bg-white/[.04] p-3 text-sm"><span>Demande {String(row.id).slice(0,8).toUpperCase()}</span><span className="text-white/45">{new Date(row.created_at).toLocaleDateString("fr-MA")}</span></Link>)}</div>:<p className="mt-5 text-sm text-white/45">Aucune demande enregistrée.</p>}</section>
      <section className="account-panel p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="text-cyan-300" size={19}/>Sécurité du compte</h2><p className="mt-4 text-sm leading-6 text-white/55">{user.email_confirmed_at?"Votre adresse e-mail est vérifiée.":"Confirmez votre adresse e-mail pour renforcer la sécurité de votre compte."}</p><Link href="/account/security" className="account-text-link mt-4">Vérifier mes paramètres <ArrowRight size={15}/></Link></section>
    </div>
  </AccountShell>
}
function OverviewCard({href,icon,label,value,detail}:{href:string;icon:React.ReactNode;label:string;value:string;detail:string}){return <Link href={href} className="account-panel group p-5"><span className="text-cyan-300">{icon}</span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-white/40">{label}</p><p className="mt-2 truncate text-2xl font-black">{value}</p><p className="mt-1 text-xs text-white/40">{detail}</p></Link>}
