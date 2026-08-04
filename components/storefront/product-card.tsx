import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import type { Offer, Product } from "@/lib/types";
import { bestOffer, priceWithOffer } from "@/lib/offers";
import { money } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import {translate,type Locale} from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import {createWhatsAppUrl} from "@/lib/whatsapp";
export function ProductCard({product,offers,locale="fr"}:{product:Product;offers:Offer[];locale?:Locale}){const t=(key:Parameters<typeof translate>[1])=>translate(locale,key),offer=bestOffer(product,offers), price=priceWithOffer(Number(product.price),offer),promo=product.promotional_price!=null&&(!product.promotion_starts_at||new Date(product.promotion_starts_at)<=new Date())&&(!product.promotion_ends_at||new Date(product.promotion_ends_at)>=new Date())?Number(product.promotional_price):null,status=product.availability_status||product.stock_status;return <article className="market-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d151d] shadow-[0_18px_45px_rgba(0,0,0,.2)] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/25">
  <Link href={`/product/${product.slug}`}>
    <div className="relative aspect-[4/3] overflow-hidden bg-white/[.04]">{product.images?.[0]?<Image fill src={product.images[0]} alt={product.name} sizes="(max-width: 640px) 72vw, (max-width: 1024px) 34vw, 260px" className="object-cover transition duration-500 group-hover:scale-105"/>:<div className="grid h-full place-items-center text-cyan-300/50">{<BrandLogo compact inverted/>}</div>}
      {(offer||promo!=null)&&<span className="absolute left-3 top-3 rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-[#061017]">{offer?.badge_text||t("offer")}</span>}
      <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#091018]/90 text-white shadow-md transition group-hover:bg-cyan-300 group-hover:text-[#061017]"><ArrowUpRight size={17}/></span>
    </div>
    <div className="p-4 pb-2">{product.brand&&<p className="mb-1 truncate text-[11px] font-bold uppercase tracking-[.12em] text-white/40">{product.brand}</p>}<div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 min-h-12 font-bold text-white">{product.name}</h3><span className="whitespace-nowrap font-bold text-cyan-300">{product.price_mode==="contact"?t("productOnRequest"):money(promo??price)}</span></div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/45"><span>{product.target_audience==="student"?t("student"):product.target_audience==="professional"?t("professional"):t("allLevels")}</span>{(offer||promo!=null)&&<span className="line-through">{money(Number(product.compare_at_price||product.price))}</span>}</div>
      <p className={`mt-2 text-xs ${status==="in_stock"?"text-emerald-300":status==="on_order"?"text-amber-300":"text-red-300"}`}>{status==="in_stock"?t("available"):status==="on_order"?t("onOrder"):t("outOfStock")}</p>
    </div>
  </Link><div className="mt-auto flex items-center justify-end px-4 pb-4"><a href={createWhatsAppUrl(`${locale==="ar"?"مرحباً DENTANOVA، أريد معلومات عن":"Bonjour DENTANOVA, je souhaite des informations sur"} ${product.name}.`)} className="flex items-center gap-1.5 text-xs font-bold text-cyan-300"><MessageCircle size={15}/>{t("whatsapp")}</a></div><FavoriteButton productId={product.id} className="absolute right-3 top-3"/></article>}
