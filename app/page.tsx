import Image from "next/image";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Headphones,MapPin,MessageCircle,ShieldCheck,Sparkles} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {getHomepageData} from "@/lib/data";
import {selectHomepageRows} from "@/lib/homepage";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
import {HomeVideoHero} from "@/components/storefront/home-video-hero";
import {ProductRow} from "@/components/storefront/product-row";
import {StudentPackCard} from "@/components/storefront/student-pack-card";
import {CampaignBanner} from "@/components/storefront/campaign-banner";

const categoryVisuals=["/visuals/category-instruments.webp","/visuals/category-equipment.webp","/visuals/category-restorative.webp","/visuals/category-orthodontics.webp"];

export default async function Home(){
  const {products,categories,offers,campaigns,packs,universities,recommendations,available}=await getHomepageData();
  const locale=await getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key),DirectionalArrow=locale==="ar"?ArrowLeft:ArrowRight;
  const rows=selectHomepageRows(products,categories,offers,recommendations.map(item=>item.product_id));
  const featuredCategories=categories.filter(category=>products.some(product=>product.category_id===category.id)).slice(0,4);
  const campaign=campaigns[0];
  const benefits:Array<[LucideIcon,string]>=[[MapPin,t("casablancaDelivery")],[Headphones,t("expertAdvice")],[MessageCircle,t("whatsappOrdering")],[ShieldCheck,t("verifiedCatalogue")]];
  return <div className="home-cinematic bg-[var(--dn-page-alt)] text-white">
    <HomeVideoHero locale={locale}/>
    <section className="border-y border-white/10 bg-[var(--dn-section-tint)]">
      <div className="container-shell grid grid-cols-2 gap-px py-1 md:grid-cols-4">
        {benefits.map(([Icon,label])=><div className="flex items-center gap-3 px-3 py-5 text-sm font-bold text-white/70" key={label}><Icon className="shrink-0 text-cyan-300" size={20}/><span>{label}</span></div>)}
      </div>
    </section>

    <section className="marketplace-section py-16 md:py-24">
      <div className="container-shell">
        <div className="flex items-end justify-between gap-6"><div><p className="eyebrow">{t("studentPacks")}</p><h2 className="display mt-3 text-4xl md:text-6xl">{t("chooseUniversity")}</h2><p className="mt-4 max-w-2xl text-white/50">{t("packsIntro")}</p></div><Link href="/student-packs" className="hidden items-center gap-2 text-sm font-bold text-cyan-300 sm:flex">{t("viewAll")}<DirectionalArrow size={17}/></Link></div>
        <div className="mt-8 flex w-full min-w-0 max-w-full gap-4 overflow-x-auto overscroll-x-contain pb-3">{universities.map(university=><Link className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.06]" href={`/student-packs/${university.slug}`} key={university.id}><span className="text-2xl font-black">{university.acronym}</span><span className="mt-2 block text-sm text-white/45">{university.city}</span></Link>)}</div>
        {packs.length>0&&<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{packs.map(pack=><StudentPackCard pack={pack} locale={locale} key={pack.id}/>)}</div>}
      </div>
    </section>

    <ProductRow titleKey="offersToday" subtitleKey="offersSubtitle" products={rows.offerProducts} offers={offers} href="/search" locale={locale}/>
    <ProductRow titleKey="recommendedProducts" subtitleKey="recommendedProductsSubtitle" products={rows.featured} offers={offers} href="/search" locale={locale}/>
    <ProductRow titleKey="newArrivals" subtitleKey="newArrivalsSubtitle" products={rows.newArrivals} offers={offers} href="/search" locale={locale}/>
    <ProductRow titleKey="studentEssentials" subtitleKey="studentEssentialsSubtitle" products={rows.studentEssentials} offers={offers} href="/student-packs" locale={locale}/>

    {featuredCategories.length>0&&<section className="py-16 md:py-24"><div className="container-shell"><div><p className="eyebrow">{t("catalogue")}</p><h2 className="display mt-3 text-4xl md:text-6xl">{t("featuredCategories")}</h2></div><div className="category-market-grid mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featuredCategories.map((category,index)=><Link key={category.id} href={`/category/${category.slug}`} className="category-visual-card group relative min-h-[320px] overflow-hidden rounded-[1.5rem]"><Image src={categoryVisuals[index%categoryVisuals.length]} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105"/><span className="category-card-shade absolute inset-0"/><span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 text-[#f4f8fb]"><b className="text-2xl">{category.name}</b><i className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(244,248,251,.16)]"><DirectionalArrow size={17}/></i></span></Link>)}</div></div></section>}

    <ProductRow titleKey="instruments" subtitleKey="instrumentsSubtitle" products={rows.instruments} offers={offers} href="/search?q=instruments" locale={locale}/>
    {rows.categoryRows.map(row=><ProductRow key={row.category.id} title={row.category.name} products={row.products} offers={offers} href={`/category/${row.category.slug}`} locale={locale}/>)}

    {campaign?<CampaignBanner campaign={campaign}/>:null}

    <section className="pb-24 pt-14"><div className="container-shell"><div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_20%,rgba(55,171,255,.24),transparent_35%),linear-gradient(135deg,#0d1922,#081018)] px-7 py-12 text-[#f4f8fb] md:px-14 md:py-16"><Sparkles className="text-[#68ddfb]"/><h2 className="display mt-5 max-w-3xl text-4xl md:text-6xl">{t("finalStudentCta")}</h2><p className="mt-5 max-w-2xl text-[rgba(244,248,251,.6)]">{t("finalStudentCtaBody")}</p><Link href="/student-packs" className="button mt-8">{t("discoverPacks")}<DirectionalArrow size={18}/></Link></div></div></section>

    {!available&&!products.length&&<section className="pb-20"><div className="container-shell card p-10 text-center text-white/50">{t("emptySection")}</div></section>}
  </div>;
}
