import { demoCampaigns, demoCategories, demoOffers, demoProducts } from "./demo-data";
import { createClient, hasSupabaseEnv } from "./supabase/server";
import type { Campaign, Category, Offer, Product } from "./types";
export async function getCatalog() {
  if (!hasSupabaseEnv) return { products: demoProducts, categories: demoCategories, offers: demoOffers, campaigns: demoCampaigns };
  const db = createClient();
  const now = new Date().toISOString();
  const [p,c,o,ca] = await Promise.all([
    db.from("products").select("*, categories(*)").eq("is_active",true).order("created_at",{ascending:false}),
    db.from("categories").select("*").order("display_order"),
    db.from("offers").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`),
    db.from("campaigns").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`).limit(1)
  ]);
  return { products:(p.data ?? []) as Product[], categories:(c.data ?? []) as Category[], offers:(o.data ?? []) as Offer[], campaigns:(ca.data ?? []) as Campaign[] };
}
