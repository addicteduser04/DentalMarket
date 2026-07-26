import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey);
export function createClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co", supabaseKey || "demo-anon-key", {
    cookies: { getAll: () => store.getAll(), setAll: (values: { name: string; value: string; options: CookieOptions }[]) => { try { values.forEach(({name,value,options}) => store.set(name,value,options)); } catch {} } }
  });
}
