import { notFound } from "next/navigation";
import { OfferForm } from "@/components/admin/offer-form";
import { createClient } from "@/lib/supabase/server";
import type { Category,Offer,Product } from "@/lib/types";

export default async function EditOffer({params}:{params:{id:string}}){
  const db=createClient(),[offerResult,categoriesResult,productsResult]=await Promise.all([
    db.from("offers").select("*").eq("id",params.id).single(),db.from("categories").select("*").order("display_order"),db.from("products").select("*").order("name"),
  ]);
  if(!offerResult.data)notFound();
  return <><p className="eyebrow">Promotions</p><h1 className="display mt-2 text-4xl">Modifier l’offre</h1><OfferForm offer={offerResult.data as Offer} categories={(categoriesResult.data??[]) as Category[]} products={(productsResult.data??[]) as Product[]}/></>
}
