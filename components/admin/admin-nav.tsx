import Link from "next/link";
import {BarChart3,Boxes,ClipboardList,FolderTree,GraduationCap,LayoutDashboard,Megaphone,Percent,School,ShoppingBag,type LucideIcon} from "lucide-react";
import {BrandLogo} from "@/components/brand-logo";
import type {Locale,MessageKey} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

const links:Array<[string,string,LucideIcon,MessageKey?]>=[
 ["/admin","Vue d’ensemble",LayoutDashboard],
 ["/admin/sales","Ventes",ShoppingBag],
 ["/admin/products","Produits",Boxes],
 ["/admin/student-packs","Packs étudiants",GraduationCap,"studentPacks"],
 ["/admin/universities","Universités",School,"universities"],
 ["/admin/academic-years","Années",FolderTree,"academicYears"],
 ["/admin/categories","Catégories",FolderTree],
 ["/admin/offers","Offres",Percent],
 ["/admin/campaigns","Campagnes",Megaphone],
 ["/admin/requests","Demandes",ClipboardList],
 ["/admin/analytics","Analytics",BarChart3],
];
export function AdminNav({locale="fr"}:{locale?:Locale}){
 return <aside className="admin-nav p-4 text-white lg:sticky lg:top-24 lg:h-fit"><div className="px-3 py-3"><BrandLogo compact inverted/><p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-cyan-300">{translate(locale,"administration")}</p></div><nav className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{links.map(([href,fallback,Icon,key])=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 transition hover:bg-white/[.07] hover:text-white"><Icon size={17}/>{key?translate(locale,key):fallback}</Link>)}</nav></aside>;
}
