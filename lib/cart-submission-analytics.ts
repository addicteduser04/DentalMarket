import type {SupabaseClient} from "@supabase/supabase-js";
import {createClient} from "./supabase/client";

export type CartSubmissionPayload = {
  items: Array<{
    item_type: "product" | "student_pack";
    product_id?: string;
    pack_id?: string;
    name: string;
    variation_id?: string;
    variation_sku?: string;
    variation_label?: string;
    qty: number;
    price: number;
    university?: string;
    academic_year?: string;
    academic_session?: string;
    pack_code?: string;
    component_summary?: string[];
    optional_component_ids?: string[];
    optional_component_summary?: string[];
  }>;
  estimated_total: number;
  user_id: string | null;
  campaign_slug: string | null;
  delivery_city: string;
};

/** Analytics is best-effort and must never block the WhatsApp handoff. */
export async function logCartSubmission(
  payload: CartSubmissionPayload,
  client: Pick<SupabaseClient,"from"> = createClient(),
) {
  try {
    const {error}=await client.from("cart_submissions").insert(payload);
    if(error)console.warn("Cart submission analytics failed",{code:error.code});
  } catch {
    console.warn("Cart submission analytics unavailable");
  }
}
