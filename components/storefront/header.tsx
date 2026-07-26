"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
export function Header() {
  const [open,setOpen]=useState(false); const count=useCart(s=>s.items.reduce((a,i)=>a+i.quantity,0));
  return <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur-xl">
    <div className="container-shell flex h-20 items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-sage text-lg font-bold text-white">D</span><span><b className="display text-xl">Dental Market</b><small className="block text-[9px] font-bold uppercase tracking-[.2em] text-sage">Maroc</small></span></Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold md:flex"><Link href="/">Accueil</Link><Link href="/category/diagnostic">Catalogue</Link><Link href="/search">Recherche</Link><Link href="/account">Mon compte</Link></nav>
      <div className="flex items-center gap-2">
        <Link aria-label="Rechercher" href="/search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white"><Search size={19}/></Link>
        <Link aria-label="Compte" href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-white sm:grid"><UserRound size={19}/></Link>
        <Link aria-label={`Panier, ${count} articles`} href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full bg-ink text-white"><ShoppingBag size={18}/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold">{count}</span>}</Link>
        <button className="grid h-10 w-10 place-items-center md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      </div>
    </div>
    {open&&<nav className="container-shell grid gap-1 border-t border-ink/10 py-4 text-sm font-semibold md:hidden">{[["/","Accueil"],["/category/diagnostic","Catalogue"],["/search","Recherche"],["/account","Mon compte"]].map(([h,l])=><Link onClick={()=>setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white" href={h} key={h}>{l}</Link>)}</nav>}
  </header>
}
