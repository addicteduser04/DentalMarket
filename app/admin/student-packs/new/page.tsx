import {createClient} from "@/lib/supabase/server";
import {StudentPackForm} from "@/components/admin/student-pack-form";
import {getLocale} from "@/lib/i18n-server";
export default async function NewStudentPack(){const db=createClient();const [u,y,p]=await Promise.all([db.from("universities").select("*").order("display_order"),db.from("academic_years").select("*").order("display_order"),db.from("products").select("*").neq("publication_status","archived").order("name")]);return <StudentPackForm universities={u.data||[]} years={y.data||[]} products={p.data||[]} locale={getLocale()}/>;}
