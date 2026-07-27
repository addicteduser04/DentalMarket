import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { getCatalog } from "@/lib/data";
import { ProductCard } from "@/components/storefront/product-card";
import { HomeVideoHero } from "@/components/storefront/home-video-hero";
import { createWhatsAppUrl } from "@/lib/whatsapp";

const categoryVisuals = [
  "/visuals/category-instruments.webp",
  "/visuals/category-equipment.webp",
  "/visuals/category-restorative.webp",
  "/visuals/category-orthodontics.webp",
];

export default async function Home() {
  const { products, categories, offers, campaigns, available } = await getCatalog();
  const campaign = campaigns[0];
  const catalogEmpty = !products.length && !categories.length;

  return <div className="home-cinematic">
    <HomeVideoHero/>

    <section id="selection" className="marketplace-section bg-[#070c11] py-20 text-white md:py-28">
      <div className="container-shell">
      {catalogEmpty ? <div className="empty-catalogue mx-auto max-w-3xl px-7 py-16 text-center md:px-14 md:py-20">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-300"><Sparkles size={23}/></span>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[.25em] text-cyan-300">{available ? "Sélection en préparation" : "Service temporairement indisponible"}</p>
        <h2 className="mt-4 text-4xl font-black uppercase tracking-[-.055em] md:text-6xl">Notre catalogue<br/>arrive bientôt</h2>
        <p className="mx-auto mt-6 max-w-lg leading-7 text-white/58">
          La sélection DENTANOVA est en cours de préparation. Contactez-nous sur WhatsApp pour toute demande de matériel dentaire.
        </p>
        <a href={createWhatsAppUrl("Bonjour DENTANOVA, je souhaite obtenir des informations sur votre matériel dentaire à Casablanca.")} className="hero-primary-cta mt-9">
          Nous contacter sur WhatsApp
        </a>
      </div> : <>
        <div className="flex items-end justify-between gap-6">
          <div><p className="text-xs font-extrabold uppercase tracking-[.25em] text-cyan-300">Explorer par catégorie</p><h2 className="mt-3 max-w-2xl text-4xl font-black uppercase tracking-[-.055em] md:text-6xl">L’essentiel de votre pratique</h2></div>
          <Link href="/search" className="hidden items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white sm:flex">Tout découvrir <ArrowRight size={17}/></Link>
        </div>
        <div className="category-visual-grid mt-10 grid gap-4 sm:grid-cols-2">
          {categories.slice(0,4).map((category,index) =>
            <Link key={category.id} href={`/category/${category.slug}`} className="category-visual-card group relative min-h-[300px] overflow-hidden rounded-[1.5rem] sm:min-h-[360px]">
              <Image src={categoryVisuals[index % categoryVisuals.length]} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.045]"/>
              <span className="category-card-shade absolute inset-0"/>
              <span className="absolute left-6 top-6 text-xs font-bold tracking-[.18em] text-white/55">0{index+1}</span>
              <span className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                <h3 className="text-3xl font-black uppercase tracking-[-.04em] md:text-4xl">{category.name}</h3>
                <i className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition group-hover:-translate-y-1 group-hover:bg-cyan-400 group-hover:text-[#061017]"><ArrowRight size={18}/></i>
              </span>
            </Link>
          )}
        </div>
        {products.some(product => product.is_featured) && <>
          <div className="mt-24 flex items-end justify-between gap-5">
            <div><p className="text-xs font-extrabold uppercase tracking-[.25em] text-cyan-300">Notre sélection</p><h2 className="mt-3 text-4xl font-black uppercase tracking-[-.055em] md:text-6xl">Les incontournables</h2></div>
            <Link href="/search" className="hidden text-sm font-bold text-white/70 sm:block">Tout voir →</Link>
          </div>
          <div className="product-grid-on-dark mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.filter(product => product.is_featured).slice(0,8).map(product =>
              <ProductCard key={product.id} product={product} offers={offers}/>
            )}
          </div>
        </>}
      </>}
      </div>
    </section>
    {campaign && <section className="bg-[#070c11] pb-20">
      <div className="container-shell">
        <Link href={campaign.banner_link || "/"} className="group flex flex-col justify-between gap-6 overflow-hidden rounded-[1.25rem] border border-cyan-300/20 bg-gradient-to-r from-cyan-500/15 to-blue-600/15 px-7 py-7 text-white sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[.16em]">Offre du moment</p><h2 className="display mt-2 text-3xl">{campaign.name}</h2></div>
          <span className="flex items-center gap-2 font-bold">En profiter <ArrowRight className="transition group-hover:translate-x-1"/></span>
        </Link>
      </div>
    </section>}
  </div>;
}
