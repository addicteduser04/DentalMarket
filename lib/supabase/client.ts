import { createBrowserClient } from "@supabase/ssr";
export const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key");
}
