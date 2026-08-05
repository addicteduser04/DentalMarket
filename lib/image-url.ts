import type {Product} from "./types";

/** Reject local computer paths accidentally imported as public media URLs. */
export function isPublicImageUrl(value:unknown):value is string {
  if(typeof value!=="string"||!value.trim())return false;
  const url=value.trim();
  if(/^\/?[a-z]:[\\/]/i.test(url)||url.includes("\\"))return false;
  return url.startsWith("/")||/^https?:\/\//i.test(url);
}

/** This legacy WordPress host is unreliable when called by Next's optimizer. */
export function shouldBypassImageOptimization(url:string){
  try{return new URL(url).hostname==="dentalmarket.ma"}catch{return false}
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
