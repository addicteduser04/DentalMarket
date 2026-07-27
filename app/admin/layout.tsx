import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  if(!hasSupabaseEnv) redirect("/account?error=configuration");
  const db=createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect("/account");
  const {data}=await db.from("profiles").select("role").eq("id",user.id).single();
  if(data?.role!=="admin") redirect("/");
  return <div className="admin-center"><div className="container-shell grid gap-6 py-8 lg:grid-cols-[245px_1fr]"><AdminNav/><div className="min-w-0">{children}</div></div></div>
}
