"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const poster = "/video/dentanova-homepage-poster.webp";

export function HomeVideoHero() {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  return (
    <section className="homepage-video-hero relative min-h-[100svh] overflow-hidden bg-[#05090d]">
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
      <div className="container-shell relative z-10 flex min-h-[100svh] items-center justify-center px-1 pt-20">
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
