import Link from "next/link";
import {AccountShell} from "@/components/account/account-shell";
import {FavoritesList} from "@/components/account/favorites-list";
import {requireAccount} from "@/lib/account-server";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
export default async function FavoritesPage(){
 const {db,isAdmin}=await requireAccount(),locale=getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 const [{data},{data:packRows}]=await Promise.all([
  db.from("favorites").select("created_at,products(*,categories(name,slug))").order("created_at",{ascending:false}),
  db.from("student_pack_favorites").select("created_at,student_packs(*,universities(slug,acronym),academic_years(label_fr,label_ar))").order("created_at",{ascending:false}),
 ]);
 const initial=(data||[]).map((row:any)=>({created_at:row.created_at,product:row.products})).filter(row=>row.product);
 return <AccountShell isAdmin={isAdmin} title="Mes favoris">{Boolean(packRows?.length)&&<section className="mb-8"><h2 className="display mb-4 text-2xl">{t("studentPackFavorites")}</h2><div className="grid gap-3">{packRows?.map((row:any)=><Link className="account-panel p-5" key={row.student_packs.id} href={`/student-packs/${row.student_packs.universities.slug}/${row.student_packs.slug}`}><b>{row.student_packs.name}</b><p className="mt-1 text-sm text-white/45">{row.student_packs.universities.acronym} · {locale==="ar"?row.student_packs.academic_years.label_ar:row.student_packs.academic_years.label_fr}</p></Link>)}</div></section>}<FavoritesList initial={initial}/></AccountShell>;
}
