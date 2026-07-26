import type { Offer, Product } from "./types";
export function isOfferActive(offer: Offer, now = new Date()) {
  return offer.is_active && new Date(offer.starts_at) <= now && (!offer.ends_at || new Date(offer.ends_at) >= now);
}
export function bestOffer(product: Product, offers: Offer[]) {
  const active = offers.filter(offer => isOfferActive(offer));
  return active.find(o => o.scope === "product" && o.product_id === product.id)
    ?? active.find(o => o.scope === "category" && o.category_id === product.category_id)
    ?? active.find(o => o.scope === "all") ?? null;
}
export function priceWithOffer(price: number, offer: Offer | null) {
  if (!offer) return price;
  return Math.max(0, offer.discount_type === "percentage" ? price * (1 - offer.discount_value / 100) : price - offer.discount_value);
}
