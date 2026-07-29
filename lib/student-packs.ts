export type University = {
  id:string; source_id?:string|null; name:string; acronym:string; city:string; slug:string;
  description?:string|null; image_url?:string|null; display_order:number; is_active:boolean;
};
export type AcademicYear = {
  id:string; code:string; label_fr:string; label_ar:string; display_order:number; is_active:boolean;
};
export type PackComponent = {
  id:string; pack_id:string; product_id:string; variation_id?:string|null; quantity:number;
  is_required:boolean; display_order:number; notes?:string|null; price_snapshot?:number|null;
  replacement_policy?:"none"|"admin_approved"|"equivalent";
  products?:import("./types").Product;
};
export type StudentPack = {
  id:string; university_id:string; academic_year_id:string; existing_product_id?:string|null;
  name:string; slug:string; short_description?:string|null; description?:string|null;
  image_url?:string|null; gallery:string[]; pack_code?:string|null; source_id?:string|null;
  source_url?:string|null; academic_session?:string|null; manual_price?:number|null;
  component_total?:number|null; promotional_price?:number|null;
  promotion_starts_at?:string|null; promotion_ends_at?:string|null;
  publication_status:"draft"|"published"|"archived";
  availability_strategy:"components"|"manual"; availability_override?:"in_stock"|"out_of_stock"|"on_order"|null;
  stock_quantity_override?:number|null; is_featured:boolean; display_order:number;
  universities?:University; academic_years?:AcademicYear; student_pack_components?:PackComponent[];
};

export function activePackPrice(pack:StudentPack, now=new Date()) {
  const regular=pack.manual_price;
  if (regular==null || !Number.isFinite(Number(regular)) || Number(regular)<0) return null;
  const promo=pack.promotional_price;
  const starts=!pack.promotion_starts_at||new Date(pack.promotion_starts_at)<=now;
  const ends=!pack.promotion_ends_at||new Date(pack.promotion_ends_at)>=now;
  return promo!=null&&Number(promo)>=0&&Number(promo)<Number(regular)&&starts&&ends?Number(promo):Number(regular);
}

export function packSavings(pack:StudentPack, now=new Date()) {
  const price=activePackPrice(pack,now), total=pack.component_total;
  if (price==null||total==null||!Number.isFinite(Number(total))||Number(total)<=price) return null;
  const amount=Number(total)-price;
  return {amount,percentage:amount/Number(total)*100};
}

export function packAvailability(pack:StudentPack) {
  if(pack.availability_strategy==="manual") return {
    status:pack.availability_override||"out_of_stock",
    quantity:pack.stock_quantity_override??0,
  };
  const required=(pack.student_pack_components||[]).filter(component=>component.is_required);
  if(!required.length) return {status:"out_of_stock" as const,quantity:0};
  let maximum=Number.POSITIVE_INFINITY;
  for(const component of required){
    const product=component.products;
    if(!product||["out_of_stock","unavailable"].includes(product.availability_status||product.stock_status))
      return {status:"out_of_stock" as const,quantity:0};
    if(product.stock_tracking){
      const variation=component.variation_id?product.variations?.find(item=>
        item.id===component.variation_id||item.source_id===component.variation_id):null;
      if(variation&&variation.availability==="out_of_stock")
        return {status:"out_of_stock" as const,quantity:0};
      const stock=Number(variation?.stock_quantity??product.stock_quantity??0);
      maximum=Math.min(maximum,Math.floor(stock/component.quantity));
    }
  }
  const quantity=Number.isFinite(maximum)?maximum:null;
  return {status:quantity===0?"out_of_stock" as const:"in_stock" as const,quantity};
}

export function packCartKey(packId:string){return `pack:${packId}`;}
