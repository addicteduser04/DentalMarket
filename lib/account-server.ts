import "server-only";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function getAccountSession() {
  if (!hasSupabaseEnv) return { db:null, user:null, profile:null, isAdmin:false };
  const db = createClient();
  const { data:{ user } } = await db.auth.getUser();
  if (!user) return { db, user:null, profile:null, isAdmin:false };
  const { data:profile } = await db.from("profiles").select("*").eq("id",user.id).single();
  return { db, user, profile, isAdmin:profile?.role === "admin" };
}

export async function requireAccount() {
  const session = await getAccountSession();
  if (!session.user || !session.db) redirect("/account");
  return session as typeof session & { db:NonNullable<typeof session.db>; user:NonNullable<typeof session.user> };
}
