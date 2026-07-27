import type { ProductImage, Variation } from "./types";

export type ProductDraft = {
  name:string; sku:string; slug:string; category_id:string; price:number; price_mode:"fixed"|"contact";
  promotional_price:number|null; promotion_starts_at:string; promotion_ends_at:string;
  stock_tracking:boolean; stock_quantity:number; low_stock_threshold:number;
  availability_status:string; publication_status:"draft"|"published"|"archived";
  images:ProductImage[]; variations:Variation[];
};

export function validateProduct(draft:ProductDraft) {
  const errors:Record<string,string>={};
  if(!draft.name.trim())errors.name="Le nom du produit est requis.";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug))errors.slug="Utilisez uniquement des minuscules, chiffres et tirets.";
  if(draft.price<0)errors.price="Le prix ne peut pas être négatif.";
  if(draft.price_mode==="fixed"&&!Number.isFinite(draft.price))errors.price="Un prix valide est requis.";
  if(draft.promotional_price!==null&&(draft.promotional_price<0||draft.promotional_price>=draft.price))errors.promotional_price="Le prix promotionnel doit être positif et inférieur au prix standard.";
  if(draft.promotion_starts_at&&draft.promotion_ends_at&&new Date(draft.promotion_ends_at)<=new Date(draft.promotion_starts_at))errors.promotion_ends_at="La fin de promotion doit suivre son début.";
  if(draft.stock_quantity<0)errors.stock_quantity="La quantité ne peut pas être négative.";
  if(draft.low_stock_threshold<0)errors.low_stock_threshold="Le seuil ne peut pas être négatif.";
  const combinations=new Set<string>();
  for(const variation of draft.variations.filter(value=>value.is_active!==false)){
    const key=JSON.stringify(Object.entries(variation.attributes||{}).sort());
    if(key!=="[]"&&combinations.has(key))errors.variations="Deux variations actives ne peuvent pas partager les mêmes attributs.";
    combinations.add(key);
    if(Number(variation.price)<0)errors.variations="Le prix d’une variation ne peut pas être négatif.";
    if(Number(variation.stock_quantity||0)<0)errors.variations="Le stock d’une variation ne peut pas être négatif.";
  }
  if(draft.publication_status==="published"){
    if(!draft.category_id)errors.category_id="Une catégorie est requise avant publication.";
    if(draft.price_mode==="fixed"&&draft.price<0)errors.price="Un prix valide est requis avant publication.";
    if(draft.availability_status==="unavailable")errors.availability_status="Un produit indisponible ne peut pas être publié.";
  }
  return {valid:!Object.keys(errors).length,errors};
}

export function validateProductImage(file:{type:string;size:number}) {
  const allowed=["image/jpeg","image/png","image/webp"];
  if(!allowed.includes(file.type))return "Format non accepté. Utilisez JPEG, PNG ou WebP.";
  if(file.size>5*1024*1024)return "L’image doit peser moins de 5 Mo.";
  return null;
}

export function publicationReadiness(draft:ProductDraft) {
  const result=validateProduct({...draft,publication_status:"published"});
  return [
    ["Nom",!result.errors.name],["Catégorie",!result.errors.category_id],
    ["Prix ou contact",!result.errors.price],["Image principale",draft.images.some(image=>image.is_main)],
    ["Disponibilité",!result.errors.availability_status],
  ] as [string,boolean][];
}
