import { createClient, hasSupabaseEnv } from "./supabase/server";
import type { Campaign, Category, Offer, Product } from "./types";
import type {StudentPack,StudentRecommendation,University} from "./student-packs";
import {isPublicImageUrl,sanitizeProductImages} from "./image-url";
export async function getCatalog() {
  const empty = { products: [] as Product[], categories: [] as Category[], offers: [] as Offer[], campaigns: [] as Campaign[] };
  if (!hasSupabaseEnv) return { ...empty, available: false };
  const db = createClient();
  const now = new Date().toISOString();
  const [p,c,o,ca] = await Promise.all([
    db.from("products").select("*, categories(*)").eq("is_active",true).order("created_at",{ascending:false}),
    db.from("categories").select("*").order("display_order"),
    db.from("offers").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`),
    db.from("campaigns").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`).order("created_at",{ascending:false}).limit(1)
  ]);
  const available = !p.error && !c.error && !o.error && !ca.error;
  return {
    products:((p.data ?? []) as Product[]).map(sanitizeProductImages),
    categories:(c.data ?? []) as Category[],
    offers:(o.data ?? []) as Offer[],
    campaigns:(ca.data ?? []) as Campaign[],
    available,
  };
}

const homepageProductFields="id,name,slug,price,compare_at_price,category_id,images,stock_status,target_audience,variations,is_active,is_featured,sku,brand,price_mode,promotional_price,promotion_starts_at,promotion_ends_at,stock_tracking,stock_quantity,availability_status,publication_status,created_at";
export async function getHomepageData(){
  const empty={products:[] as Product[],categories:[] as Category[],offers:[] as Offer[],campaigns:[] as Campaign[],packs:[] as StudentPack[],universities:[] as University[],recommendations:[] as StudentRecommendation[]};
  if(!hasSupabaseEnv)return {...empty,available:false};
  const db=createClient(),now=new Date().toISOString();
  const [p,c,o,ca,sp,u,r]=await Promise.all([
    db.from("products").select(homepageProductFields).eq("is_active",true).eq("publication_status","published").eq("catalog_visible",true).order("created_at",{ascending:false}).limit(96),
    db.from("categories").select("id,name,slug,parent_id,display_order").order("display_order"),
    db.from("offers").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`),
    db.from("campaigns").select("*").eq("is_active",true).lte("starts_at",now).or(`ends_at.is.null,ends_at.gte.${now}`).order("created_at",{ascending:false}).limit(1),
    db.from("student_packs").select("*,universities(*),academic_years(*)").eq("publication_status","published").order("display_order").limit(6),
    db.from("universities").select("*").eq("is_active",true).order("display_order"),
    db.from("student_recommended_products").select("id,product_id,university_id,academic_year_id,display_order,is_active").eq("is_active",true),
  ]);
  return {
    products:((p.data||[]) as unknown as Product[]).map(sanitizeProductImages),categories:(c.data||[]) as Category[],
    offers:(o.data||[]) as Offer[],campaigns:(ca.data||[]) as Campaign[],
    packs:((sp.data||[]) as unknown as StudentPack[]).map(pack=>({...pack,image_url:isPublicImageUrl(pack.image_url)?pack.image_url:null})),universities:((u.data||[]) as University[]).map(university=>({...university,image_url:isPublicImageUrl(university.image_url)?university.image_url:null})),
    recommendations:(r.data||[]) as StudentRecommendation[],
    available:![p,c,o,ca,sp,u].some(result=>result.error),
  };
}
