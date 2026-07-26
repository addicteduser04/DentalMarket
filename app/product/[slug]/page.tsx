import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { getCatalog } from "@/lib/data";
import { bestOffer, priceWithOffer } from "@/lib/offers";
import { money } from "@/lib/utils";
export default async function ProductPage({params}:{params:{slug:string}}){const {products,offers,categories}=await getCatalog();const p=products.find(x=>x.slug===params.slug);if(!p)notFound();const category=categories.find(c=>c.id===p.category_id), offer=bestOffer(p,offers), price=priceWithOffer(Number(p.price),offer);return <div className="container-shell py-10"><div className="mb-7 text-xs text-ink/45"><Link href="/">Accueil</Link> / {category?.name} / <span className="text-ink">{p.name}</span></div><div className="grid gap-10 lg:grid-cols-2">
  <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-white">{p.images?.[0]?<Image src={p.images[0]} fill priority alt={p.name} className="object-cover"/>:<div className="grid h-full place-items-center">Dental Market</div>}{offer&&<span className="absolute left-5 top-5 rounded-full bg-coral px-4 py-2 text-sm font-bold text-white">{offer.badge_text||offer.name}</span>}</div>
  <div className="flex flex-col justify-center lg:px-6"><p className="eyebrow">{category?.name||"Instrument"}</p><h1 className="display mt-3 text-5xl leading-tight">{p.name}</h1><div className="mt-5 flex items-baseline gap-3"><span className="text-2xl font-bold text-sage">{money(price)}</span>{offer&&<span className="text-sm text-ink/40 line-through">{money(Number(p.compare_at_price||p.price))}</span>}</div><p className="mt-6 leading-7 text-ink/60">{p.description}</p><div className="my-7 grid gap-2 border-y border-ink/10 py-5 text-sm"><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-sage"/>Qualité sélectionnée pour la pratique clinique</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-sage"/>{p.stock_status==="in_stock"?"En stock":p.stock_status==="on_order"?"Disponible sur commande":"Rupture de stock"}</span></div><AddToCart product={p} price={price}/><p className="mt-3 text-center text-xs text-ink/40">Confirmation et conseil personnalisé sur WhatsApp</p></div>
</div></div>}
