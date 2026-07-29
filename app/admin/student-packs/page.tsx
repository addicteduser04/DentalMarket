import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
export default async function StudentPacksAdmin(){
 const {data}=await createClient().from("student_packs").select("*,universities(acronym),academic_years(label_fr,label_ar)").order("updated_at",{ascending:false});
 const locale=getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 return <div><div className="flex justify-between"><div><p className="eyebrow">{t("studentCatalogue")}</p><h1 className="display mt-2 text-4xl">{t("studentPacks")}</h1></div><div className="flex gap-2"><Link href="/admin/student-packs/review" className="account-button-secondary">{t("sourceReview")}</Link><Link href="/admin/student-packs/new" className="button">{t("newPack")}</Link></div></div>
 <div className="card mt-7 overflow-x-auto p-2"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr><th>{t("packName")}</th><th>{t("university")}</th><th>{t("year")}</th><th>{t("price")}</th><th>{t("status")}</th></tr></thead><tbody>{(data||[]).map((pack:any)=><tr key={pack.id}><td><Link className="font-bold text-cyan-300" href={`/admin/student-packs/${pack.id}`}>{pack.name}</Link></td><td>{pack.universities?.acronym}</td><td>{locale==="ar"?pack.academic_years?.label_ar:pack.academic_years?.label_fr}</td><td>{pack.manual_price??t("priceOnRequest")}</td><td>{t(pack.publication_status as "draft"|"published"|"archived")}</td></tr>)}</tbody></table></div></div>;
}
