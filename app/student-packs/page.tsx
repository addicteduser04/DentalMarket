import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {getStudentPackCatalog} from "@/lib/student-pack-data";
import {StudentPackCard} from "@/components/storefront/student-pack-card";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
import {BrandLogo} from "@/components/brand-logo";
export const metadata:Metadata={title:"Packs étudiants",description:"Packs de fournitures dentaires DENTANOVA organisés par université et année."};
export default async function StudentPacksPage(){
  const {universities,packs}=await getStudentPackCatalog(),locale=await getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  return <div className="store-page"><div className="container-shell py-14"><BrandLogo compact inverted/><h1 className="display mt-3 text-5xl">{t("studentPacks")}</h1><p className="mt-4 max-w-2xl text-white/55">{t("packsIntro")}</p>
    <section className="mt-12"><h2 className="display text-3xl">{t("chooseUniversity")}</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{universities.map(university=><Link href={`/student-packs/${university.slug}`} className="card flex items-center gap-4 p-5" key={university.id}>{university.image_url&&<span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white"><Image src={university.image_url} fill alt="" className="object-contain"/></span>}<span><b className="text-xl">{university.acronym}</b><small className="mt-1 block text-white/50">{university.name}</small><small className="mt-1 block text-cyan-300">{university.city}</small></span></Link>)}</div></section>
    <section className="mt-14"><h2 className="display text-3xl">{t("studentPacks")}</h2>{packs.length?<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{packs.map(pack=><StudentPackCard pack={pack} locale={locale} key={pack.id}/>)}</div>:<div className="card mt-6 p-10 text-center text-white/50">{t("noPacks")}</div>}</section>
  </div></div>;
}
