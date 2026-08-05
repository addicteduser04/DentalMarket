import type {Product} from "./types";

/** Reject local computer paths accidentally imported as public media URLs. */
export function isPublicImageUrl(value:unknown):value is string {
  if(typeof value!=="string"||!value.trim())return false;
  const url=value.trim();
  if(/^\/?[a-z]:[\\/]/i.test(url)||url.includes("\\"))return false;
  return url.startsWith("/")||/^https?:\/\//i.test(url);
}

export function sanitizeProductImages<T extends Product>(product:T):T {
  return {
    ...product,
    images:(product.images||[]).filter(isPublicImageUrl),
    variations:(product.variations||[]).map(variation=>({
      ...variation,
      image_url:isPublicImageUrl(variation.image_url)?variation.image_url:null,
    })),
  };
}
