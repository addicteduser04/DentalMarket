import type { Offer, Product } from "./types";
export function isOfferActive(offer: Offer, now = new Date()) {
  const startsAt = new Date(offer.starts_at);
  const endsAt = offer.ends_at ? new Date(offer.ends_at) : null;
  return offer.is_active
    && Number.isFinite(startsAt.getTime())
    && (!endsAt || Number.isFinite(endsAt.getTime()))
    && startsAt <= now
    && (!endsAt || endsAt >= now);
}
function isCoherentOffer(offer: Offer) {
  const validDiscount = Number.isFinite(Number(offer.discount_value))
    && Number(offer.discount_value) > 0
    && (offer.discount_type === "fixed" || Number(offer.discount_value) <= 100);
  if (!validDiscount) return false;
  if (offer.scope === "product") return Boolean(offer.product_id);
  if (offer.scope === "category") return Boolean(offer.category_id);
  return offer.scope === "all";
}
function newestFirst(a: Offer, b: Offer) {
  const created = new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  return created || b.id.localeCompare(a.id);
}
export function bestOffer(product: Product, offers: Offer[], now = new Date()) {
  const active = offers.filter(offer => isOfferActive(offer, now) && isCoherentOffer(offer)).sort(newestFirst);
  return active.find(o => o.scope === "product" && o.product_id === product.id)
    ?? active.find(o => o.scope === "category" && o.category_id === product.category_id)
    ?? active.find(o => o.scope === "all") ?? null;
}
export function priceWithOffer(price: number, offer: Offer | null) {
  if (!offer) return price;
  const discounted = offer.discount_type === "percentage" ? price * (1 - offer.discount_value / 100) : price - offer.discount_value;
  return Math.max(0, Math.round((discounted + Number.EPSILON) * 100) / 100);
}
