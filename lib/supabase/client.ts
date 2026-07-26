import { createBrowserClient } from "@supabase/ssr";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey);
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co", supabaseKey || "demo-anon-key");
}
