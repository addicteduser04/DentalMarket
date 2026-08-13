"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {LocaleSwitcher} from "./locale-switcher";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";
export function Header({locale="fr"}:{locale?:Locale}) {
  const [open,setOpen]=useState(false); const count=useCart(s=>s.items.reduce((a,i)=>a+i.quantity,0));
  const home = usePathname() === "/";
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  return <header className={`z-50 w-full border-b border-white/10 text-white backdrop-blur-xl transition-colors ${home ? "absolute left-0 top-0 bg-[var(--dn-header-transparent)]" : "sticky top-0 bg-[var(--dn-header-solid)]"}`}>
    <div className="container-shell flex h-20 items-center justify-between">
      <Link href="/" aria-label="DENTANOVA — Accueil"><BrandLogo compact inverted/></Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold md:flex"><Link href="/">{t("home")}</Link><Link href="/search">{t("catalogue")}</Link><Link href="/student-packs">{t("studentPacks")}</Link><Link href="/search">{t("search")}</Link><Link href="/account">{t("account")}</Link></nav>
      <div className="flex items-center gap-2">
        <span className="hidden sm:block"><LocaleSwitcher locale={locale}/></span>
        <ThemeToggle className="hidden sm:grid"/>
        <Link aria-label={t("search")} href="/search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"><Search size={19}/></Link>
        <Link aria-label={t("account")} href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-white/10 sm:grid"><UserRound size={19}/></Link>
        <Link aria-label={`${t("cart")}, ${count}`} href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white"><ShoppingBag size={18}/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-[#061017]">{count}</span>}</Link>
        <button aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="grid h-10 w-10 place-items-center md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      </div>
    </div>
    {open&&<nav className="container-shell grid gap-1 border-t border-white/10 bg-[var(--dn-header-menu)] py-4 text-sm font-semibold md:hidden">{[["/",t("home")],["/search",t("catalogue")],["/student-packs",t("studentPacks")],["/account",t("account")]].map(([h,l])=><Link onClick={()=>setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/10" href={h} key={h}>{l}</Link>)}<div className="mt-2 flex items-center gap-2 border-t border-white/10 px-3 pt-3 sm:hidden"><LocaleSwitcher locale={locale}/><ThemeToggle/></div></nav>}
  </header>
}
