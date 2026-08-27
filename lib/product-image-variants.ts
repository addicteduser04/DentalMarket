import variantRegistry from "../data/product-image-variants.json";

export type ProductImageVariant="card"|"detail"|"original";

export const PRODUCT_IMAGE_PLACEHOLDER="/branding/dentanova-product-placeholder.svg";
export const PRODUCT_IMAGE_VARIANTS={card:{width:480,quality:78},detail:{width:1200,quality:82}} as const;

const STORAGE_MARKER="/storage/v1/object/public/product-images/";

type VariantRegistry=Record<string,Array<Exclude<ProductImageVariant,"original">>>;
const verifiedVariantRegistry=variantRegistry as VariantRegistry;

export function productImageStoragePath(source:string){
  try{const path=new URL(source).pathname,index=path.indexOf(STORAGE_MARKER);return index<0?null:decodeURIComponent(path.slice(index+STORAGE_MARKER.length))}catch{return null}
}

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

export function productImageCandidates(source:string|null|undefined,variant:ProductImageVariant,registry:VariantRegistry=verifiedVariantRegistry){
  if(!source)return [PRODUCT_IMAGE_PLACEHOLDER];
  const path=productImageStoragePath(source),available=variant!=="original"&&Boolean(path&&registry[path]?.includes(variant));
  const optimized=available?productImageVariantUrl(source,variant):source;
  return [...new Set([optimized,source,PRODUCT_IMAGE_PLACEHOLDER])];
}
