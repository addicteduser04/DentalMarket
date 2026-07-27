import { AccountShell } from "@/components/account/account-shell";
import { DeliveryForm } from "@/components/account/delivery-form";
import { requireAccount } from "@/lib/account-server";
export default async function DeliveryPage(){const {db,isAdmin}=await requireAccount();const {data}=await db.from("delivery_addresses").select("*").eq("is_default",true).maybeSingle();return <AccountShell isAdmin={isAdmin} title="Adresses et livraison"><DeliveryForm initial={data}/></AccountShell>}
