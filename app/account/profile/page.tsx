import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
export default async function ProfilePage(){if(!hasSupabaseEnv)return <div className="container-shell py-16"><h1 className="display text-5xl">Mon profil</h1><p className="mt-4">Configurez Supabase pour utiliser l’espace personnel.</p></div>;const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/account");const {data}=await db.from("profiles").select("*").eq("id",user.id).single();return <div className="container-shell max-w-2xl py-16"><p className="eyebrow">Espace personnel</p><h1 className="display mb-8 mt-3 text-5xl">Mon profil</h1><ProfileForm id={user.id} initial={data||{}}/></div>}
