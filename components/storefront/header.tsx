"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { BrandLogo } from "@/components/brand-logo";
export function Header() {
  const [open,setOpen]=useState(false); const count=useCart(s=>s.items.reduce((a,i)=>a+i.quantity,0));
  const home = usePathname() === "/";
  return <header className={`z-50 w-full border-b border-white/10 text-white backdrop-blur-xl transition-colors ${home ? "absolute left-0 top-0 bg-[#05090d]/25" : "sticky top-0 bg-[#070c11]/90"}`}>
    <div className="container-shell flex h-20 items-center justify-between">
      <Link href="/" aria-label="DENTALNOVA — Accueil"><BrandLogo compact inverted/></Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold md:flex"><Link href="/">Accueil</Link><Link href="/search">Catalogue</Link><Link href="/search">Recherche</Link><Link href="/account">Mon compte</Link></nav>
      <div className="flex items-center gap-2">
        <Link aria-label="Rechercher" href="/search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"><Search size={19}/></Link>
        <Link aria-label="Compte" href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-white/10 sm:grid"><UserRound size={19}/></Link>
        <Link aria-label={`Panier, ${count} articles`} href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white"><ShoppingBag size={18}/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-[#061017]">{count}</span>}</Link>
        <button aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="grid h-10 w-10 place-items-center md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      </div>
    </div>
    {open&&<nav className="container-shell grid gap-1 border-t border-white/10 bg-[#070c11]/95 py-4 text-sm font-semibold md:hidden">{[["/","Accueil"],["/search","Catalogue"],["/account","Mon compte"]].map(([h,l])=><Link onClick={()=>setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/10" href={h} key={h}>{l}</Link>)}</nav>}
  </header>
}
