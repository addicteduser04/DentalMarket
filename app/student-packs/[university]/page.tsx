import {notFound} from "next/navigation";
import Link from "next/link";
import {getStudentPackCatalog} from "@/lib/student-pack-data";
import {StudentPackCard} from "@/components/storefront/student-pack-card";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
import {ProductCard} from "@/components/storefront/product-card";
export async function generateMetadata({params}:{params:Promise<{university:string}>}){const [{universities},{university}]=await Promise.all([getStudentPackCatalog(),params]);const u=universities.find(x=>x.slug===university);return {title:u?`Packs ${u.acronym}`:"Packs étudiants"};}
export default async function UniversityPacks({params,searchParams}:{params:Promise<{university:string}>;searchParams:Promise<{year?:string}>}){
  const [{universities,years,packs,recommendations},{university:universitySlug},locale,resolvedSearch]=await Promise.all([getStudentPackCatalog(),params,getLocale(),searchParams]),university=universities.find(x=>x.slug===universitySlug),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);if(!university)notFound();
  const filtered=packs.filter(pack=>pack.university_id===university.id&&(!resolvedSearch.year||pack.academic_years?.code===resolvedSearch.year));
  const supplies=recommendations.filter(item=>item.university_id===university.id&&(!resolvedSearch.year||item.academic_years?.code===resolvedSearch.year));
  return <div className="store-page"><div className="container-shell py-14"><nav className="text-sm text-white/45"><Link href="/student-packs">{t("studentPacks")}</Link> / {university.acronym}</nav><p className="eyebrow mt-8">{university.city}</p><h1 className="display mt-3 text-5xl">{university.name}</h1>
    <div className="mt-8 flex flex-wrap gap-2"><Link className="rounded-full border border-white/15 px-4 py-2 text-sm" href={`/student-packs/${university.slug}`}>{t("allYears")}</Link>{years.map(year=><Link className="rounded-full border border-white/15 px-4 py-2 text-sm" key={year.id} href={`/student-packs/${university.slug}?year=${year.code}`}>{locale==="ar"?year.label_ar:year.label_fr}</Link>)}</div>
    <section className="mt-10"><h2 className="display text-3xl">{t("officialFixedPacks")}</h2><p className="mt-2 text-sm text-white/50">{t("fixedPacksExplanation")}</p>
      {filtered.length?<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(pack=><StudentPackCard pack={pack} locale={locale} key={pack.id}/>)}</div>:<div className="card mt-6 p-10 text-center text-white/50">{t("noPacks")}</div>}
    </section>
    <section className="mt-14"><h2 className="display text-3xl">{t("recommendedSupplies")}</h2><p className="mt-2 max-w-3xl text-sm text-white/50">{t("recommendedExplanation")}</p>
      {supplies.length?<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{supplies.map(item=>item.products&&<ProductCard key={item.id} product={item.products} offers={[]} locale={locale}/>)}</div>:<div className="card mt-6 p-10 text-center text-white/50">{t("noRecommendedSupplies")}</div>}
    </section>
  </div></div>;
}
