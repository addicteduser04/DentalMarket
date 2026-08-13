"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {translate,type Locale} from "@/lib/i18n";

const poster = "/video/dentanova-homepage-poster.webp";

export function HomeVideoHero({locale="fr"}:{locale?:Locale}) {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  return (
    <section className="homepage-video-hero relative min-h-[100svh] overflow-hidden bg-[var(--dn-bg)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden="true"
      />
      {reducedMotion === false && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
        >
          <source src="/video/dentanova-homepage.mp4" type="video/mp4" />
        </video>
      )}
      <div className="homepage-video-overlay absolute inset-0" aria-hidden="true"/>
      <div className="container-shell relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-1 pb-12 pt-28 text-center text-white">
        <p className="eyebrow !text-cyan-200">DENTANOVA · Casablanca</p>
        <h1 className="display mt-4 max-w-4xl text-4xl leading-[.98] text-white sm:text-6xl lg:text-7xl">{locale==="ar"?"معدات طب الأسنان بثقة واحترافية":"Le matériel dentaire, sélectionné avec exigence"}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{locale==="ar"?"كتالوج احترافي لطلبة وأطباء الأسنان، مع التوصيل في جميع أنحاء المغرب.":"Un catalogue professionnel pour les étudiants et praticiens, avec livraison partout au Maroc."}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/search" className="hero-primary-cta">{translate(locale,"catalogue")}<ArrowRight size={18}/></Link><Link href="/student-packs" className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-white/25 bg-black/20 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10">{translate(locale,"studentPacks")}</Link></div>
        <form action="/search" method="get" role="search" className="homepage-hero-search">
          <Search aria-hidden="true" size={23}/>
          <label htmlFor="homepage-search" className="sr-only">Rechercher dans le catalogue DENTANOVA</label>
          <input
            id="homepage-search"
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Rechercher un produit, une catégorie ou un équipement…"
          />
          <button type="submit">Rechercher</button>
        </form>
      </div>
    </section>
  );
}
