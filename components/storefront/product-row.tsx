import Link from "next/link";
import {ArrowLeft,ArrowRight} from "lucide-react";
import type {Locale,MessageKey} from "@/lib/i18n";
import {translate} from "@/lib/i18n";
import type {Offer,Product} from "@/lib/types";
import {ProductCard} from "./product-card";

export function ProductRow({titleKey,title,subtitleKey,products,offers,href,locale}:{titleKey?:MessageKey;title?:string;subtitleKey?:MessageKey;products:Product[];offers:Offer[];href:string;locale:Locale}){
  if(!products.length)return null;
  const t=(key:MessageKey)=>translate(locale,key),DirectionalArrow=locale==="ar"?ArrowLeft:ArrowRight;
  return <section className="market-row py-10 md:py-14">
    <div className="container-shell">
      <div className="flex items-end justify-between gap-5"><div><h2 className="display text-3xl md:text-4xl">{title||(titleKey&&t(titleKey))}</h2>{subtitleKey&&<p className="mt-2 max-w-2xl text-sm text-white/50">{t(subtitleKey)}</p>}</div><Link href={href} className="hidden shrink-0 items-center gap-2 text-sm font-bold text-cyan-300 sm:flex">{t("viewAll")}<DirectionalArrow size={17}/></Link></div>
      <div className="market-row-track mt-7" dir={locale==="ar"?"rtl":"ltr"}>{products.map(product=><div className="market-row-item" key={product.id}><ProductCard product={product} offers={offers} locale={locale}/></div>)}</div>
      <Link href={href} className="mt-5 flex items-center gap-2 text-sm font-bold text-cyan-300 sm:hidden">{t("viewAll")}<DirectionalArrow size={17}/></Link>
    </div>
  </section>;
}
