import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { DELIVERY_ZONE } from "@/lib/whatsapp";
import {getLocale} from "@/lib/i18n-server";
import {translate} from "@/lib/i18n";

type SubmittedItem = {
  item_type: "product"|"student_pack";
  product_id?: string;
  pack_id?: string;
  name: string;
  variation_label?: string;
  qty: number;
  price: number;
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items.map((item:SubmittedItem)=>({
    ...item,item_type:item.item_type||(item.product_id?"product":item.pack_id?"student_pack":undefined),
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
  const { data: { user } } = await db.auth.getUser();
  const productIds=items.filter(i=>i.item_type==="product").map(i=>i.product_id as string);
  const packIds=items.filter(i=>i.item_type==="student_pack").map(i=>i.pack_id as string);
  const [{data:products},{data:packs}]=await Promise.all([
    productIds.length?db.from("products").select("id,name,price,promotional_price,publication_status,is_active,availability_status").in("id",productIds):Promise.resolve({data:[]}),
    packIds.length?db.from("student_packs").select("id,name,pack_code,academic_session,manual_price,promotional_price,promotion_starts_at,promotion_ends_at,publication_status,universities(acronym),academic_years(label_fr),student_pack_components(quantity,products(name))").in("id",packIds):Promise.resolve({data:[]}),
  ]);
  const now=Date.now(),validated=items.map(item=>{
    if(item.item_type==="product"){const product=products?.find(p=>p.id===item.product_id);if(!product||!product.is_active||product.publication_status!=="published")return null;return {...item,name:product.name,price:Number(product.promotional_price??product.price)};}
    const pack=packs?.find(p=>p.id===item.pack_id);if(!pack||pack.publication_status!=="published"||pack.manual_price==null)return null;
    const promo=pack.promotional_price!=null&&Number(pack.promotional_price)<Number(pack.manual_price)
      &&(!pack.promotion_starts_at||new Date(pack.promotion_starts_at).getTime()<=now)
      &&(!pack.promotion_ends_at||new Date(pack.promotion_ends_at).getTime()>=now);
    const university=Array.isArray(pack.universities)?pack.universities[0]:pack.universities;
    const year=Array.isArray(pack.academic_years)?pack.academic_years[0]:pack.academic_years;
    return {...item,name:pack.name,price:Number(promo?pack.promotional_price:pack.manual_price),
      university:university?.acronym,academicYear:year?.label_fr,academicSession:pack.academic_session,
      packCode:pack.pack_code,componentSummary:(pack.student_pack_components||[]).slice(0,8).map((c:any)=>`${c.quantity}× ${Array.isArray(c.products)?c.products[0]?.name:c.products?.name}`)};
  });
  if(validated.some(item=>!item))return NextResponse.json({error:translate(getLocale(),"cartUnavailable")},{status:409});
  const safeItems=validated as SubmittedItem[];
  const estimatedTotal = safeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const { error } = await db.from("cart_submissions").insert({
    user_id: user?.id ?? null,
    items:safeItems,
    estimated_total: estimatedTotal,
    campaign_slug: typeof body?.campaignSlug === "string" ? body.campaignSlug : null,
    status: "whatsapp_handoff",
    delivery_city: DELIVERY_ZONE,
  });

  if (error) {
    return NextResponse.json({ error: "Impossible d’enregistrer la demande. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, deliveryZone: DELIVERY_ZONE,items:safeItems });
}
