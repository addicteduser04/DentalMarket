import Link from "next/link";
import { BarChart3, Boxes, FolderTree, LayoutDashboard, Megaphone, Percent } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
const links=[["/admin","Vue d’ensemble",LayoutDashboard],["/admin/products","Produits",Boxes],["/admin/categories","Catégories",FolderTree],["/admin/offers","Offres",Percent],["/admin/campaigns","Campagnes",Megaphone],["/admin/analytics","Analytics",BarChart3]] as const;
export function AdminNav(){return <aside className="rounded-2xl bg-ink p-4 text-white lg:sticky lg:top-24 lg:h-fit"><div className="px-3 py-3"><BrandLogo compact inverted/><p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-mint">Administration</p></div><nav className="mt-2 grid gap-1">{links.map(([href,label,Icon])=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"><Icon size={17}/>{label}</Link>)}</nav></aside>}
