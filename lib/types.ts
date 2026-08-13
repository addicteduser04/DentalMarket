export type Variation = {
  id?: string; label: string; sku?: string; attributes?: Record<string,string>;
  price: number; stock_quantity?: number; availability?: "in_stock"|"out_of_stock"|"on_order";
  is_active?: boolean; image_url?: string; regular_price?:number; sale_price?:number|null;
  source_id?:string; description?:string; min_quantity?:number;
};
export type ProductImage = { url:string; alt:string; is_main:boolean };
export type Category = { id: string; name: string; slug: string; parent_id?: string | null; display_order?: number };
export type Product = {
  id: string; name: string; slug: string; description: string | null; price: number;
  compare_at_price: number | null; category_id: string | null; images: string[];
  stock_status: "in_stock" | "out_of_stock" | "on_order";
  target_audience: "student" | "professional" | "both";
  variations: Variation[]; is_active: boolean; is_featured: boolean; categories?: Category | null;
  sku?:string|null; brand?:string|null; product_type?:string|null; short_summary?:string|null;
  technical_specs?:Record<string,string>; condition?:"new"|"refurbished"; warranty?:string|null;
  image_metadata?:ProductImage[]; price_mode?:"fixed"|"contact"; promotional_price?:number|null;
  promotion_starts_at?:string|null; promotion_ends_at?:string|null; stock_tracking?:boolean;
  stock_quantity?:number; low_stock_threshold?:number;
  availability_status?:"in_stock"|"low_stock"|"out_of_stock"|"on_order"|"unavailable";
  preparation_time?:string|null; internal_stock_note?:string|null;
  publication_status?:"draft"|"published"|"archived"; search_visible?:boolean;
  catalog_visible?:boolean; published_at?:string|null; delivery_eligible?:boolean;
  delivery_note?:string|null; pickup_available?:boolean; seo_title?:string|null;
  meta_description?:string|null; og_image_url?:string|null; created_at?:string; updated_at?:string;
  import_source?:string|null; import_key?:string|null; source_metadata?:Record<string,unknown>;
};
export type Offer = {
  id: string; name: string; badge_text: string | null; discount_type: "percentage" | "fixed";
  discount_value: number; scope: "all" | "category" | "product"; category_id: string | null;
  product_id: string | null; starts_at: string; ends_at: string | null; is_active: boolean;
  created_at?: string;
};
export type Campaign = { id: string; name: string; slug: string; banner_image_url: string | null; banner_link: string | null; offer_id: string | null; starts_at: string; ends_at: string | null; is_active: boolean; created_at?:string };
