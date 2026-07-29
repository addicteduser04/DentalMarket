import Image from "next/image";
import Link from "next/link";
import type {StudentPack} from "@/lib/student-packs";
import {activePackPrice,packSavings} from "@/lib/student-packs";
import {money} from "@/lib/utils";
import type {Locale} from "@/lib/i18n";
import {translate} from "@/lib/i18n";

export function StudentPackCard({pack,locale="fr"}:{pack:StudentPack;locale?:Locale}){
  const price=activePackPrice(pack),savings=packSavings(pack);
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  return <Link href={`/student-packs/${pack.universities?.slug}/${pack.slug}`} className="card group overflow-hidden">
    <div className="relative aspect-[4/3] bg-white/[.04]">{pack.image_url?<Image src={pack.image_url} fill alt={pack.name} className="object-cover transition duration-500 group-hover:scale-105"/>:<div className="grid h-full place-items-center text-cyan-300/45">DENTANOVA</div>}</div>
    <div className="p-5"><p className="eyebrow">{pack.universities?.acronym} · {locale==="ar"?pack.academic_years?.label_ar:pack.academic_years?.label_fr}</p>
      <h2 className="mt-2 text-xl font-bold">{pack.name}</h2>
      {pack.academic_session&&<p className="mt-2 text-sm text-white/45">{pack.academic_session}</p>}
      <div className="mt-4 flex items-end justify-between"><b className="text-cyan-300">{price==null?t("priceOnRequest"):money(price)}</b>{savings&&<span className="text-xs text-emerald-300">-{Math.round(savings.percentage)}%</span>}</div>
    </div>
  </Link>;
}
