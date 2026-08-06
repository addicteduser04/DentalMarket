import { priceWithOffer } from "./offers";
import type { Offer, Product } from "./types";

export function resolveProductDisplayPrices(product: Product, offer: Offer | null = null, now = new Date()) {
  const standardPrice = Number(product.price);
  const activeProductPromotion = product.promotional_price != null
    && Number(product.promotional_price) < standardPrice
    && (!product.promotion_starts_at || new Date(product.promotion_starts_at) <= now)
    && (!product.promotion_ends_at || new Date(product.promotion_ends_at) >= now);

  const currentDisplayedPrice = activeProductPromotion
    ? Number(product.promotional_price)
    : offer
      ? priceWithOffer(standardPrice, offer)
      : standardPrice;

  const hasDiscount = currentDisplayedPrice < standardPrice;
  return {
    currentDisplayedPrice,
    crossedOutPrice: hasDiscount ? standardPrice : null,
    showCrossedOutPrice: hasDiscount,
    hasDiscount,
  };
}
