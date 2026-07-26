export type Variation = { label: string; price: number };
export type Category = { id: string; name: string; slug: string; parent_id?: string | null; display_order?: number };
export type Product = {
  id: string; name: string; slug: string; description: string | null; price: number;
  compare_at_price: number | null; category_id: string | null; images: string[];
  stock_status: "in_stock" | "out_of_stock" | "on_order";
  target_audience: "student" | "professional" | "both";
  variations: Variation[]; is_active: boolean; is_featured: boolean; categories?: Category | null;
};
export type Offer = {
  id: string; name: string; badge_text: string | null; discount_type: "percentage" | "fixed";
  discount_value: number; scope: "all" | "category" | "product"; category_id: string | null;
  product_id: string | null; starts_at: string; ends_at: string | null; is_active: boolean;
};
export type Campaign = { id: string; name: string; slug: string; banner_image_url: string | null; banner_link: string | null; offer_id: string | null; starts_at: string; ends_at: string | null; is_active: boolean };
