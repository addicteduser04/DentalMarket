import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {StudentPackForm} from "@/components/admin/student-pack-form";
import {getLocale} from "@/lib/i18n-server";
export default async function EditStudentPack({params}:{params:{id:string}}){const db=createClient();const [pack,u,y,p]=await Promise.all([db.from("student_packs").select("*,student_pack_components(*)").eq("id",params.id).maybeSingle(),db.from("universities").select("*").order("display_order"),db.from("academic_years").select("*").order("display_order"),db.from("products").select("*").neq("publication_status","archived").order("name")]);if(!pack.data)notFound();return <StudentPackForm pack={pack.data as any} universities={u.data||[]} years={y.data||[]} products={p.data||[]} locale={getLocale()}/>;}
