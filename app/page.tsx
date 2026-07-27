import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { getCatalog } from "@/lib/data";
import { ProductCard } from "@/components/storefront/product-card";
import { BrandLogo } from "@/components/brand-logo";
import { createWhatsAppUrl } from "@/lib/whatsapp";

export default async function Home() {
  const { products, categories, offers, campaigns, available } = await getCatalog();
  const campaign = campaigns[0];
  const catalogEmpty = !products.length && !categories.length;

  return <>
    <section className="container-shell py-8 lg:py-14">
      <div className="cinematic-hero relative overflow-hidden rounded-[2rem] bg-ink px-7 py-16 text-white md:px-14 md:py-24">
        <div className="hero-light hero-light-one" aria-hidden="true"/>
        <div className="hero-light hero-light-two" aria-hidden="true"/>
        <div className="hero-grid" aria-hidden="true"/>
        <div className="hero-content relative max-w-2xl">
          <div className="hero-logo inline-flex rounded-2xl bg-white/95 px-4 py-3 shadow-2xl">
            <BrandLogo/>
          </div>
          <p className="eyebrow hero-copy mt-8 !text-mint">La précision au quotidien</p>
          <h1 className="display hero-copy mt-5 text-5xl leading-[.98] md:text-7xl">
            L’exigence clinique.<br/><i className="font-normal text-mint">Le geste en confiance.</i>
          </h1>
          <p className="hero-copy mt-6 max-w-lg text-base leading-7 text-white/70">
            Du matériel dentaire sélectionné avec soin pour les étudiants et professionnels à Casablanca.
          </p>
          <div className="hero-copy mt-8 flex flex-wrap gap-3">
            <Link href="#selection" className="button !bg-white !text-ink">Découvrir DENTALNOVA <ArrowRight size={18}/></Link>
            <a href={createWhatsAppUrl()} className="button !border-white/20 !bg-white/10">Nous contacter</a>
          </div>
        </div>
        <div className="hero-copy relative mt-14 grid gap-3 border-t border-white/10 pt-6 text-xs text-white/65 sm:grid-cols-3">
          <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-mint"/> Matériel sélectionné</span>
          <span className="flex items-center gap-2"><Truck size={17} className="text-mint"/> Livraison exclusivement à Casablanca</span>
          <span className="flex items-center gap-2"><Sparkles size={17} className="text-mint"/> Conseil humain</span>
        </div>
      </div>
    </section>

    {campaign && <section className="container-shell">
      <Link href={campaign.banner_link || "/"} className="group flex flex-col justify-between gap-6 overflow-hidden rounded-[1.5rem] bg-coral px-7 py-7 text-white sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[.16em]">Offre du moment</p><h2 className="display mt-2 text-3xl">{campaign.name}</h2></div>
        <span className="flex items-center gap-2 font-bold">En profiter <ArrowRight className="transition group-hover:translate-x-1"/></span>
      </Link>
    </section>}

    <section id="selection" className="container-shell py-20">
      {catalogEmpty ? <div className="card mx-auto max-w-2xl px-7 py-16 text-center">
        <div className="mx-auto inline-flex rounded-2xl bg-white px-4 py-3"><BrandLogo/></div>
        <p className="eyebrow mt-8">{available ? "Bientôt disponible" : "Service temporairement indisponible"}</p>
        <h2 className="display mt-3 text-4xl md:text-5xl">Notre catalogue arrive bientôt</h2>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-ink/60">
          La sélection DENTALNOVA est en cours de préparation. Contactez-nous sur WhatsApp pour toute demande de matériel dentaire.
        </p>
        <a href={createWhatsAppUrl("Bonjour DENTALNOVA, je souhaite obtenir des informations sur votre matériel dentaire à Casablanca.")} className="button mt-8">
          Nous contacter sur WhatsApp
        </a>
      </div> : <>
        <div className="flex items-end justify-between">
          <div><p className="eyebrow">Par discipline</p><h2 className="display mt-2 text-4xl md:text-5xl">Trouvez votre essentiel</h2></div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.slice(0,4).map((category,index) =>
            <Link key={category.id} href={`/category/${category.slug}`} className={`group min-h-40 rounded-[1.3rem] p-5 ${index%3===0?"bg-mint":index%3===1?"bg-white":"bg-[#e8dfd1]"}`}>
              <span className="text-xs font-bold text-ink/45">0{index+1}</span>
              <h3 className="display mt-14 text-2xl">{category.name}</h3>
              <ArrowRight className="mt-2 transition group-hover:translate-x-1" size={18}/>
            </Link>
          )}
        </div>
        <div className="mt-20 flex items-end justify-between gap-5">
          <div><p className="eyebrow">Notre sélection</p><h2 className="display mt-2 text-4xl md:text-5xl">Les incontournables</h2></div>
          <Link href="/search" className="hidden text-sm font-bold sm:block">Tout voir →</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.filter(product => product.is_featured).slice(0,8).map(product =>
            <ProductCard key={product.id} product={product} offers={offers}/>
          )}
        </div>
      </>}
    </section>
  </>;
}
