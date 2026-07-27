import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Offer, Product } from "@/lib/types";
import { bestOffer, priceWithOffer } from "@/lib/offers";
import { money } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
export function ProductCard({product,offers}:{product:Product;offers:Offer[]}){const offer=bestOffer(product,offers), price=priceWithOffer(Number(product.price),offer);return <article className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d151d] shadow-[0_18px_45px_rgba(0,0,0,.2)] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/25">
  <Link href={`/product/${product.slug}`}>
    <div className="relative aspect-[4/3] overflow-hidden bg-white/[.04]">{product.images?.[0]?<Image fill src={product.images[0]} alt={product.name} className="object-cover transition duration-500 group-hover:scale-105"/>:<div className="grid h-full place-items-center text-cyan-300/50">DENTALNOVA</div>}
      {offer&&<span className="absolute left-3 top-3 rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-[#061017]">{offer.badge_text||"Offre"}</span>}
      <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#091018]/90 text-white shadow-md transition group-hover:bg-cyan-300 group-hover:text-[#061017]"><ArrowUpRight size={17}/></span>
    </div>
    <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-white">{product.name}</h3><span className="whitespace-nowrap font-bold text-cyan-300">{product.price_mode==="contact"?"Sur demande":money(Number(product.promotional_price||price))}</span></div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/45"><span>{product.target_audience==="student"?"Étudiant":product.target_audience==="professional"?"Professionnel":"Tous niveaux"}</span>{offer&&<span className="line-through">{money(Number(product.compare_at_price||product.price))}</span>}</div>
    </div>
  </Link><FavoriteButton productId={product.id} className="absolute right-3 top-3"/></article>}
