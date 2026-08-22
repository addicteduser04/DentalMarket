import {createClient} from "@/lib/supabase/server";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
export default async function StudentPackReview(){
 const {data}=await createClient().from("student_pack_components").select("id,variation_id,source_metadata,student_packs(name),products(name,sku)").order("display_order");
 const review=(data||[]).filter((row:any)=>(row.source_metadata?.allowed_variation_ids||[]).length>1&&!row.variation_id);
 const locale=await getLocale(),t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 return <div><p className="eyebrow">{t("sourceImport")}</p><h1 className="display mt-2 text-4xl">{t("componentsToReview")}</h1><p className="mt-3 text-white/50">{t("reviewExplanation")}</p><div className="mt-7 grid gap-3">{review.map((row:any)=><div className="card p-5" key={row.id}><b>{row.products?.name}</b><p className="mt-1 text-sm text-white/45">{row.student_packs?.name} · SKU {row.products?.sku||"—"}</p><p className="mt-2 text-xs text-cyan-300">{t("sourceVariations")} : {row.source_metadata.allowed_variation_ids.join(", ")}</p></div>)}{!review.length&&<div className="card p-8 text-white/50">{t("noReview")}</div>}</div></div>;
}
