import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { DELIVERY_CITY } from "@/lib/whatsapp";

type SubmittedItem = {
  product_id: string;
  name: string;
  variation_label?: string;
  qty: number;
  price: number;
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const items = body?.items as SubmittedItem[] | undefined;
  const deliveryAccepted = body?.deliveryAccepted === true;

  if (!deliveryAccepted || body?.deliveryCity !== DELIVERY_CITY) {
    return NextResponse.json({ error: "La livraison doit être confirmée pour Casablanca." }, { status: 400 });
  }
  if (!Array.isArray(items) || !items.length || items.some(item =>
    !item.product_id || !item.name || !Number.isFinite(item.qty) || item.qty < 1 || !Number.isFinite(item.price) || item.price < 0
  )) {
    return NextResponse.json({ error: "Le panier est invalide." }, { status: 400 });
  }

  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  const estimatedTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const { error } = await db.from("cart_submissions").insert({
    user_id: user?.id ?? null,
    items,
    estimated_total: estimatedTotal,
    campaign_slug: typeof body?.campaignSlug === "string" ? body.campaignSlug : null,
  });

  if (error) {
    return NextResponse.json({ error: "Impossible d’enregistrer la demande. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, deliveryCity: DELIVERY_CITY });
}
