import {createClient} from "@/lib/supabase/server";
import {buildDashboardState,type DashboardSubmission} from "@/lib/admin-dashboard";
import {money} from "@/lib/utils";

export default async function AdminHome(){
  const db=createClient(),now=new Date(),nowIso=now.toISOString(),thirtyDaysAgo=new Date(now.getTime()-30*24*60*60*1000).toISOString();
  const [submissions,stock,offers,campaigns]=await Promise.all([
    db.from("cart_submissions").select("created_at,estimated_total,campaign_slug,items").gte("created_at",thirtyDaysAgo).lte("created_at",nowIso),
    db.from("products").select("id",{count:"exact",head:true}).neq("stock_status","in_stock"),
    db.from("offers").select("id",{count:"exact",head:true}).eq("is_active",true).lte("starts_at",nowIso).or(`ends_at.is.null,ends_at.gte.${nowIso}`),
    db.from("campaigns").select("id",{count:"exact",head:true}).eq("is_active",true).lte("starts_at",nowIso).or(`ends_at.is.null,ends_at.gte.${nowIso}`),
  ]);
  const state=buildDashboardState({submissions:{data:(submissions.data??[]) as DashboardSubmission[],error:submissions.error},stock:{count:stock.count,error:stock.error},offers:{count:offers.count,error:offers.error},campaigns:{count:campaigns.count,error:campaigns.error}},now);
  if(!state.ok){console.error("Admin dashboard query failed",state.failed);return <><p className="eyebrow">Pilotage DENTANOVA</p><h1 className="display mt-2 text-4xl">Santé commerciale</h1><div className="card mt-7 border border-red-300/20 p-7"><h2 className="text-lg font-bold text-red-200">Données temporairement indisponibles</h2><p className="mt-2 text-sm text-white/55">Impossible de charger les indicateurs sans risque d’afficher des valeurs incorrectes. Réessayez dans quelques instants.</p></div></>}
  const metrics=state.metrics;
  return <>
    <div><p className="eyebrow">Pilotage DENTANOVA</p><h1 className="display mt-2 text-4xl">Santé commerciale</h1><p className="mt-3 text-sm text-white/45">Demandes panier transmises vers WhatsApp — valeurs estimées, hors paiements confirmés.</p></div>
    <section className="mt-7"><h2 className="display text-2xl">7 derniers jours</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Metric label="Demandes WhatsApp" value={metrics.sevenDays.count}/><Metric label="Total estimé" value={money(metrics.sevenDays.total)}/></div></section>
    <section className="mt-7"><h2 className="display text-2xl">30 derniers jours</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Metric label="Demandes WhatsApp" value={metrics.thirtyDays.count}/><Metric label="Total estimé" value={money(metrics.thirtyDays.total)}/></div></section>
    <section className="mt-7"><h2 className="display text-2xl">Santé du catalogue</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><Metric label={'Produits hors "in_stock"'} value={metrics.nonInStockProducts}/><Metric label="Offres actuellement actives" value={metrics.activeOffers}/><Metric label="Campagnes actuellement actives" value={metrics.activeCampaigns}/></div></section>
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <section className="card p-6"><h2 className="display text-2xl">Top 10 produits — 30 jours</h2><p className="mt-2 text-xs text-white/40">Fréquence d’apparition dans les paniers transmis, indépendamment de la quantité.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-white/40"><tr><th className="py-2">Produit</th><th className="text-right">Fréquence</th></tr></thead><tbody>{metrics.topProducts.map((product,index)=><tr className="border-t border-white/10" key={product.id}><td className="py-3">{index+1}. {product.name}</td><td className="text-right font-bold">{product.frequency}</td></tr>)}</tbody></table>{!metrics.topProducts.length?<p className="py-6 text-sm text-white/45">Aucun produit soumis sur cette période.</p>:null}</div></section>
      <section className="card p-6"><h2 className="display text-2xl">Attribution campagnes — 30 jours</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-white/40"><tr><th className="py-2">Campagne</th><th className="text-right">Demandes</th><th className="text-right">Total estimé</th></tr></thead><tbody>{metrics.campaigns.map(row=><tr className="border-t border-white/10" key={row.slug??"sans-campagne"}><td className="py-3">{row.slug??"Sans campagne"}</td><td className="text-right font-bold">{row.count}</td><td className="text-right">{money(row.total)}</td></tr>)}</tbody></table>{!metrics.campaigns.length?<p className="py-6 text-sm text-white/45">Aucune demande sur cette période.</p>:null}</div></section>
    </div>
  </>
}
function Metric({label,value}:{label:string;value:number|string}){return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wide text-white/40">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>}
