import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
function getSupabaseConfig() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it to your Supabase project URL.");
  }
  if (!supabaseKey) {
    throw new Error("Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  }
  return { url: supabaseUrl, key: supabaseKey };
}
export function createClient() {
  const store = cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient(url, key, {
    cookies: { getAll: async () => (await store).getAll(), setAll: async (values: { name: string; value: string; options: CookieOptions }[]) => { try { const resolved=await store; values.forEach(({name,value,options}) => resolved.set(name,value,options)); } catch {} } }
  });
}
