import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { DELIVERY_ZONE } from "@/lib/whatsapp";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";
import {getClientIp, hashFingerprint} from "@/lib/rate-limit";

type SubmittedItem = {
  item_type: "product"|"student_pack";
  product_id?: string;
  pack_id?: string;
  name: string;
  variation_label?: string;
  qty: number;
  price: number;
  optional_component_ids?: string[];
};

function sanitizeLabel(value?: string) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
  return cleaned || undefined;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items.map((item:SubmittedItem)=>({
    ...item,item_type:item.item_type||(item.product_id?"product":item.pack_id?"student_pack":undefined),
    variation_label:sanitizeLabel(item.variation_label),
  })) as SubmittedItem[] : undefined;
  const deliveryAccepted = body?.deliveryAccepted === true;

  if (!deliveryAccepted || body?.deliveryZone !== DELIVERY_ZONE) {
    return NextResponse.json({ error: "La livraison doit être confirmée pour le Maroc." }, { status: 400 });
  }
  if (!Array.isArray(items) || !items.length || items.some(item =>
    !["product","student_pack"].includes(item.item_type) || (item.item_type==="product"?!item.product_id:!item.pack_id)
    || !item.name || !Number.isFinite(item.qty) || item.qty < 1 || !Number.isFinite(item.price) || item.price < 0
  )) {
    return NextResponse.json({ error: "Le panier est invalide." }, { status: 400 });
  }

  const db = createClient();
  const fingerprint = hashFingerprint(getClientIp(request.headers));
  const { data: allowed, error: rateLimitError } = await db.rpc("check_cart_submission_rate_limit", { p_fingerprint: fingerprint });
  if (!rateLimitError && allowed === false) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez dans quelques minutes." }, { status: 429 });
  }
  const { data: { user } } = await db.auth.getUser();
  const productIds=items.filter(i=>i.item_type==="product").map(i=>i.product_id as string);
  const packIds=items.filter(i=>i.item_type==="student_pack").map(i=>i.pack_id as string);
  const [{data:products},{data:packs}]=await Promise.all([
    productIds.length?db.from("products").select("id,name,price,promotional_price,publication_status,is_active,availability_status").in("id",productIds):Promise.resolve({data:[]}),
    packIds.length?db.from("student_packs").select("id,name,pack_code,academic_session,manual_price,promotional_price,promotion_starts_at,promotion_ends_at,publication_status,universities(acronym),academic_years(label_fr),student_pack_components(id,quantity,is_required,variation_id,price_snapshot,products(name,price,promotional_price,variations))").in("id",packIds):Promise.resolve({data:[]}),
  ]);
  const now=Date.now(),validated=items.map(item=>{
    if(item.item_type==="product"){const product=products?.find(p=>p.id===item.product_id);if(!product||!product.is_active||product.publication_status!=="published")return null;return {...item,name:product.name,price:Number(product.promotional_price??product.price)};}
    const pack=packs?.find(p=>p.id===item.pack_id);if(!pack||pack.publication_status!=="published"||pack.manual_price==null)return null;
    const promo=pack.promotional_price!=null&&Number(pack.promotional_price)<Number(pack.manual_price)
      &&(!pack.promotion_starts_at||new Date(pack.promotion_starts_at).getTime()<=now)
      &&(!pack.promotion_ends_at||new Date(pack.promotion_ends_at).getTime()>=now);
    const university=Array.isArray(pack.universities)?pack.universities[0]:pack.universities;
    const year=Array.isArray(pack.academic_years)?pack.academic_years[0]:pack.academic_years;
    const requestedIds=Array.isArray(item.optional_component_ids)?[...new Set(item.optional_component_ids.filter(id=>typeof id==="string"))]:[];
    const components=pack.student_pack_components||[];
    const selected=components.filter((component:any)=>!component.is_required&&requestedIds.includes(component.id));
    if(selected.length!==requestedIds.length)return null;
    const optionTotal=selected.reduce((sum:number,component:any)=>{
      const product=Array.isArray(component.products)?component.products[0]:component.products;
      const variation=component.variation_id&&Array.isArray(product?.variations)?product.variations.find((entry:any)=>entry.id===component.variation_id||entry.source_id===component.variation_id):null;
      const unitPrice=Number(component.price_snapshot??variation?.price??product?.promotional_price??product?.price);
      return sum+(Number.isFinite(unitPrice)?unitPrice*Number(component.quantity):0);
    },0);
    const requiredSummary=components.filter((component:any)=>component.is_required).slice(0,8).map((component:any)=>{const product=Array.isArray(component.products)?component.products[0]:component.products;return `${component.quantity}× ${product?.name}`});
    const optionalSummary=selected.map((component:any)=>{const product=Array.isArray(component.products)?component.products[0]:component.products;return `${component.quantity}× ${product?.name}`});
    return {...item,name:pack.name,price:Number(promo?pack.promotional_price:pack.manual_price)+optionTotal,
      university:university?.acronym,academicYear:year?.label_fr,academicSession:pack.academic_session,
      packCode:pack.pack_code,componentSummary:requiredSummary,optionalComponentSummary:optionalSummary};
  });
  if(validated.some(item=>!item))return NextResponse.json({error:translate(getLocale(),"cartUnavailable")},{status:409});
  const safeItems=validated as SubmittedItem[];
  const estimatedTotal = safeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const submission = {
    user_id: user?.id ?? null,
    items:safeItems,
    estimated_total: estimatedTotal,
    campaign_slug: typeof body?.campaignSlug === "string" ? body.campaignSlug : null,
    status: "whatsapp_handoff",
    delivery_city: DELIVERY_ZONE,
    client_fingerprint: fingerprint,
  };
  let {error}=await db.from("cart_submissions").insert(submission);

  // Remain compatible with databases that have not applied the Morocco-wide
  // delivery migration yet. The intended zone is retained in the JSON field.
  if(error?.code==="23514"&&error.message.toLowerCase().includes("delivery_city")){
    console.warn("Apply migration 20260805120000_delivery_all_morocco.sql to remove the legacy delivery-city constraint.");
    const retry=await db.from("cart_submissions").insert({...submission,delivery_city:"Casablanca",delivery_address:{zone:DELIVERY_ZONE}});
    error=retry.error;
  }

  // Remain compatible with databases that have not applied the rate-limit migration yet.
  if(error?.code==="42703"&&error.message.toLowerCase().includes("client_fingerprint")){
    console.warn("Apply migration 20260807140000_cart_submission_rate_limit.sql to enable rate limiting.");
    const {client_fingerprint,...withoutFingerprint}=submission;
    const retry=await db.from("cart_submissions").insert(withoutFingerprint);
    error=retry.error;
  }

  if (error) {
    console.error("cart submission insert failed",{code:error.code,message:error.message,details:error.details});
    return NextResponse.json({ error: "Impossible d’enregistrer la demande. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, deliveryZone: DELIVERY_ZONE,items:safeItems });
}
