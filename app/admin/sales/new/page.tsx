import { SaleForm } from "@/components/admin/sale-form";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default async function NewSalePage(){
  const {data}=await createClient().from("products").select("id,name,sku,price,promotional_price,variations,stock_tracking,stock_quantity,publication_status").neq("publication_status","archived").order("name");
  return <><p className="eyebrow">Ventes WhatsApp</p><h1 className="display mt-2 text-4xl">Nouvelle vente manuelle</h1><p className="mb-7 mt-3 text-sm text-white/45">La référence sera attribuée automatiquement. Le stock ne sera déduit qu’après confirmation.</p><SaleForm products={(data||[]) as Product[]}/></>
}
