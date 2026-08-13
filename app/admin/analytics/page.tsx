import Link from "next/link";
import {ExternalLink} from "lucide-react";

export default function AnalyticsPage(){return <>
  <p className="eyebrow">Santé du site</p>
  <h1 className="display mt-2 text-4xl">Vercel Analytics</h1>
  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Les indicateurs commerciaux DENTANOVA restent séparés des statistiques techniques de fréquentation.</p>
  <div className="mt-7 grid max-w-4xl gap-5 md:grid-cols-2">
    <section className="card p-7"><h2 className="display text-2xl">Activité commerciale</h2><p className="mt-3 leading-7 text-white/55">Retrouvez sur la vue d’ensemble les demandes WhatsApp, montants estimés, produits fréquents, états du catalogue et attributions de campagnes.</p><Link href="/admin" className="button mt-6">Ouvrir la vue d’ensemble</Link></section>
    <section className="card p-7"><h2 className="display text-2xl">Audience technique</h2><p className="mt-3 leading-7 text-white/55">Vercel Analytics présente les visites, pages vues et données d’usage du site. Consultez-les directement dans le tableau de bord Vercel.</p><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="button mt-6">Ouvrir Vercel Analytics <ExternalLink size={17}/></a></section>
  </div>
</>}
