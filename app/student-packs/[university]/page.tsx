import {notFound} from "next/navigation";
import Link from "next/link";
import {getStudentPackCatalog} from "@/lib/student-pack-data";
import {StudentPackCard} from "@/components/storefront/student-pack-card";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
export async function generateMetadata({params}:{params:{university:string}}){const {universities}=await getStudentPackCatalog();const u=universities.find(x=>x.slug===params.university);return {title:u?`Packs ${u.acronym}`:"Packs étudiants"};}
export default async function UniversityPacks({params,searchParams}:{params:{university:string};searchParams:{year?:string}}){
  const {universities,years,packs}=await getStudentPackCatalog(),university=universities.find(x=>x.slug===params.university),locale=getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);if(!university)notFound();
  const filtered=packs.filter(pack=>pack.university_id===university.id&&(!searchParams.year||pack.academic_years?.code===searchParams.year));
  return <div className="store-page"><div className="container-shell py-14"><nav className="text-sm text-white/45"><Link href="/student-packs">{t("studentPacks")}</Link> / {university.acronym}</nav><p className="eyebrow mt-8">{university.city}</p><h1 className="display mt-3 text-5xl">{university.name}</h1>
    <div className="mt-8 flex flex-wrap gap-2"><Link className="rounded-full border border-white/15 px-4 py-2 text-sm" href={`/student-packs/${university.slug}`}>{t("allYears")}</Link>{years.map(year=><Link className="rounded-full border border-white/15 px-4 py-2 text-sm" key={year.id} href={`/student-packs/${university.slug}?year=${year.code}`}>{locale==="ar"?year.label_ar:year.label_fr}</Link>)}</div>
    {filtered.length?<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(pack=><StudentPackCard pack={pack} locale={locale} key={pack.id}/>)}</div>:<div className="card mt-10 p-12 text-center text-white/50">{t("noPacks")}</div>}
  </div></div>;
}
