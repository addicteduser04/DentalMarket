export type ProductImageVariant="card"|"detail"|"original";

export const PRODUCT_IMAGE_PLACEHOLDER="/branding/dentanova-product-placeholder.svg";
export const PRODUCT_IMAGE_VARIANTS={card:{width:480,quality:78},detail:{width:1200,quality:82}} as const;

const STORAGE_MARKER="/storage/v1/object/public/product-images/";

/** Variant objects sit beside immutable originals, preserving every existing URL. */
export function productImageVariantUrl(source:string,variant:Exclude<ProductImageVariant,"original">){
  try{
    const url=new URL(source);
    if(!url.pathname.includes(STORAGE_MARKER))return source;
    url.pathname=`${url.pathname}.dn-${variant}.webp`;
    url.search="";
    return url.toString();
  }catch{return source}
}

export function productImageCandidates(source:string|null|undefined,variant:ProductImageVariant){
  if(!source)return [PRODUCT_IMAGE_PLACEHOLDER];
  const optimized=variant==="original"?source:productImageVariantUrl(source,variant);
  return [...new Set([optimized,source,PRODUCT_IMAGE_PLACEHOLDER])];
}
