import {bestOffer} from "./offers";
import type {Category,Offer,Product} from "./types";

export function hasActivePromotion(product:Product,offers:Offer[],now=new Date()){
  const productPromotion=product.promotional_price!=null
    && Number(product.promotional_price)<Number(product.price)
    && (!product.promotion_starts_at||new Date(product.promotion_starts_at)<=now)
    && (!product.promotion_ends_at||new Date(product.promotion_ends_at)>=now);
  return productPromotion||Boolean(bestOffer(product,offers));
}

export function selectHomepageRows(products:Product[],categories:Category[],offers:Offer[],studentProductIds:string[],limit=8){
  const used=new Set<string>();
  const take=(candidates:Product[])=>{
    const selected:Product[]=[];
    for(const product of candidates){
      if(used.has(product.id))continue;
      used.add(product.id);
      selected.push(product);
      if(selected.length===limit)break;
    }
    return selected;
  };
  const published=products.filter(product=>product.is_active&&product.publication_status!=="draft"&&product.publication_status!=="archived");
  const offerProducts=published.filter(product=>hasActivePromotion(product,offers)).slice(0,limit);
  const featured=published.filter(product=>product.is_featured).slice(0,limit);
  const newArrivals=[...published].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))||a.name.localeCompare(b.name,"fr")||a.id.localeCompare(b.id)).slice(0,limit);
  [...offerProducts,...featured,...newArrivals].forEach(product=>used.add(product.id));
  const studentSet=new Set(studentProductIds);
  const studentEssentials=take(published.filter(product=>studentSet.has(product.id)||product.target_audience==="student"));
  const instrumentCategory=categories.find(category=>/instrument/i.test(`${category.name} ${category.slug}`));
  const instruments=take(published.filter(product=>product.category_id===instrumentCategory?.id));
  const categoryRows=categories.map(category=>({category,products:take(published.filter(product=>product.category_id===category.id))})).filter(row=>row.products.length>=3).slice(0,2);
  return {offerProducts,featured,newArrivals,studentEssentials,instruments,categoryRows};
}
