import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Offer, Product } from "@/lib/types";
import { bestOffer, priceWithOffer } from "@/lib/offers";
import { money } from "@/lib/utils";
export function ProductCard({product,offers}:{product:Product;offers:Offer[]}){const offer=bestOffer(product,offers), price=priceWithOffer(Number(product.price),offer);return <Link href={`/product/${product.slug}`} className="group">
  <article className="relative overflow-hidden rounded-[1.4rem] bg-white">
    <div className="relative aspect-[4/3] overflow-hidden bg-mint/50">{product.images?.[0]?<Image fill src={product.images[0]} alt={product.name} className="object-cover transition duration-500 group-hover:scale-105"/>:<div className="grid h-full place-items-center text-sage">DENTALNOVA</div>}
      {offer&&<span className="absolute left-3 top-3 rounded-full bg-coral px-3 py-1 text-xs font-bold text-white">{offer.badge_text||"Offre"}</span>}
      <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow-md transition group-hover:bg-ink group-hover:text-white"><ArrowUpRight size={17}/></span>
    </div>
    <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{product.name}</h3><span className="whitespace-nowrap font-bold text-sage">{money(price)}</span></div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink/50"><span>{product.target_audience==="student"?"Étudiant":product.target_audience==="professional"?"Professionnel":"Tous niveaux"}</span>{offer&&<span className="line-through">{money(Number(product.compare_at_price||product.price))}</span>}</div>
    </div>
  </article></Link>}
