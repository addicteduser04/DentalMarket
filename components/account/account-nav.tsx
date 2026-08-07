"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BookHeart, ChevronDown, ClipboardList, LayoutDashboard, LockKeyhole, LogOut, MapPin, Settings, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  ["/account","Vue d’ensemble",LayoutDashboard],
  ["/account/profile","Mon profil",UserRound],
  ["/account/favorites","Mes favoris",BookHeart],
  ["/account/orders","Mes demandes et commandes",ClipboardList],
  ["/account/delivery","Adresses et livraison",MapPin],
  ["/account/security","Sécurité",LockKeyhole],
  ["/account/notifications","Notifications",Bell],
] as const;

export function AccountNav({isAdmin}:{isAdmin:boolean}) {
  const pathname=usePathname(), router=useRouter(), [open,setOpen]=useState(false);
  const current=links.find(([href])=>pathname===href)?.[1] || "Espace personnel";
  async function signOut(){await createClient().auth.signOut();router.push("/account");router.refresh()}
  const navigation=<>
    {links.map(([href,label,Icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={`account-nav-link ${pathname===href?"is-active":""}`}><Icon size={18}/>{label}</Link>)}
    {isAdmin&&<Link href="/admin" className="account-nav-link admin"><ShieldCheck size={18}/>Administration</Link>}
    <button onClick={signOut} className="account-nav-link w-full"><LogOut size={18}/>Déconnexion</button>
  </>;
  return <>
    <aside className="account-sidebar hidden lg:block">
      <BrandLogo compact inverted/>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300/70">Centre de compte</p>
      <nav className="mt-6 grid gap-1">{navigation}</nav>
    </aside>
    <div className="relative lg:hidden">
      <button onClick={()=>setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.06] px-4 py-4 font-bold">
        <span className="flex items-center gap-2"><Settings size={18}/>{current}</span><ChevronDown className={`transition ${open?"rotate-180":""}`} size={18}/>
      </button>
      {open&&<nav className="absolute left-0 right-0 top-[calc(100%+.5rem)] z-40 grid gap-1 rounded-2xl border border-white/10 bg-[var(--dn-surface-raised-solid)] p-3 shadow-2xl">{navigation}</nav>}
    </div>
  </>;
}
