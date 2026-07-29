import {createClient} from "@/lib/supabase/server";
import {getLocale} from "@/lib/i18n-server";
import {StudentRecommendationManager} from "@/components/admin/student-recommendation-manager";

export default async function StudentRecommendationsAdmin(){
  const {data}=await createClient().from("student_recommended_products")
    .select("id,display_order,is_active,source_url,universities(acronym),academic_years(label_fr,label_ar),products(name)")
    .order("display_order").limit(1000);
  return <StudentRecommendationManager initial={(data||[]) as any} locale={getLocale()}/>;
}
