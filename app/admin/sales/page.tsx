import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deliveryStatusLabels,paymentStatusLabels,saleStatusLabels,type SaleRecord } from "@/lib/sales";
import { money } from "@/lib/utils";

type Params={q?:string;from?:string;to?:string;product?:string;payment?:string;delivery?:string;status?:string};
export default async function SalesPage({searchParams}:{searchParams:Params}){
  const db=createClient();
  let query=db.from("sales").select("*,sale_items(id,product_id,product_name,quantity),creator:profiles!sales_created_by_fkey(full_name)").order("sale_at",{ascending:false}).limit(500);
  if(searchParams.from)query=query.gte("sale_at",`${searchParams.from}T00:00:00`);
  if(searchParams.to)query=query.lte("sale_at",`${searchParams.to}T23:59:59.999`);
  if(searchParams.payment)query=query.eq("payment_status",searchParams.payment);
  if(searchParams.delivery)query=query.eq("delivery_status",searchParams.delivery);
  if(searchParams.status)query=query.eq("sale_status",searchParams.status);
  const [{data},{data:products}]=await Promise.all([query,db.from("products").select("id,name").order("name")]);
  const needle=(searchParams.q||"").trim().toLowerCase();
  const rows=((data||[]) as unknown as SaleRecord[]).filter(sale=>
    (!needle||[sale.reference,sale.customer_name,sale.customer_phone].some(value=>value?.toLowerCase().includes(needle)))&&
    (!searchParams.product||sale.sale_items?.some(item=>item.product_id===searchParams.product))
  );
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Commerce WhatsApp</p><h1 className="display mt-2 text-4xl">Ventes</h1><p className="mt-2 text-sm text-white/45">Ventes finalisées et enregistrées manuellement par l’administration.</p></div><Link className="account-button" href="/admin/sales/new">Nouvelle vente</Link></div>
    <form className="card mt-7 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="admin-field xl:col-span-2">Client ou référence<input name="q" defaultValue={searchParams.q} placeholder="Nom, téléphone ou référence"/></label>
      <label className="admin-field">Du<input type="date" name="from" defaultValue={searchParams.from}/></label><label className="admin-field">Au<input type="date" name="to" defaultValue={searchParams.to}/></label>
      <label className="admin-field">Produit<select name="product" defaultValue={searchParams.product}><option value="">Tous</option>{products?.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <Filter name="payment" label="Paiement" value={searchParams.payment} options={paymentStatusLabels}/><Filter name="delivery" label="Livraison" value={searchParams.delivery} options={deliveryStatusLabels}/><Filter name="status" label="Vente" value={searchParams.status} options={saleStatusLabels}/>
      <div className="flex gap-2 md:col-span-2 xl:col-span-4"><button className="account-button">Filtrer</button><Link className="account-button-secondary" href="/admin/sales">Réinitialiser</Link></div>
    </form>
    {!rows.length?<div className="card mt-6 grid min-h-64 place-items-center p-8 text-center"><div><ShoppingBag className="mx-auto text-cyan-300"/><h2 className="mt-4 text-xl font-black">Aucune vente</h2><p className="mt-2 text-sm text-white/45">Créez une vente ou ajustez les filtres.</p></div></div>:<div className="card mt-6 overflow-x-auto p-2"><table className="w-full min-w-[1180px] text-left text-sm"><thead><tr><th>Référence</th><th>Date</th><th>Client</th><th>Produits</th><th>Total</th><th>Paiement</th><th>Livraison</th><th>Vente</th><th>Enregistrée par</th><th/></tr></thead><tbody>{rows.map(sale=><tr key={sale.id}><td className="font-black text-cyan-300">{sale.reference}</td><td>{new Date(sale.sale_at).toLocaleString("fr-MA")}</td><td><b>{sale.customer_name}</b><small className="block text-white/40">{sale.customer_phone}</small></td><td>{sale.sale_items?.map(item=>`${item.product_name} × ${item.quantity}`).join(", ")}</td><td className="font-black">{money(Number(sale.total_amount))}</td><td><span className="account-badge">{paymentStatusLabels[sale.payment_status]}</span></td><td><span className="account-badge">{deliveryStatusLabels[sale.delivery_status]}</span></td><td><span className="account-badge">{saleStatusLabels[sale.sale_status]}</span></td><td>{sale.creator?.full_name||"Administrateur"}</td><td><Link href={`/admin/sales/${sale.id}`} className="account-button-secondary">Voir / modifier</Link></td></tr>)}</tbody></table></div>}
  </>
}
function Filter({name,label,value,options}:{name:string;label:string;value?:string;options:Record<string,string>}){return <label className="admin-field">{label}<select name={name} defaultValue={value}><option value="">Tous</option>{Object.entries(options).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>}
