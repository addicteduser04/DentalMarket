import {createClient} from "@/lib/supabase/server";
import {AcademicYearManager} from "@/components/admin/academic-year-manager";
import {getLocale} from "@/lib/i18n-server";
export default async function AcademicYearsPage(){const {data}=await createClient().from("academic_years").select("*").order("display_order");return <AcademicYearManager initial={data||[]} locale={getLocale()}/>;}
