import {createClient} from "@/lib/supabase/server";
import {UniversityManager} from "@/components/admin/university-manager";
import {getLocale} from "@/lib/i18n-server";
export default async function UniversitiesPage(){const {data}=await createClient().from("universities").select("*").order("display_order");return <UniversityManager initial={data||[]} locale={getLocale()}/>;}
