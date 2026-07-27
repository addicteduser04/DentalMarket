import { notFound } from "next/navigation";
import { PrintReceiptButton } from "@/components/admin/print-receipt-button";
import { SaleForm } from "@/components/admin/sale-form";
import { createClient } from "@/lib/supabase/server";
import { deliveryStatusLabels,paymentMethodLabels,paymentStatusLabels,saleStatusLabels,type SaleRecord } from "@/lib/sales";
import type { Product } from "@/lib/types";
import { money } from "@/lib/utils";

export default async function SalePage({params}:{params:{saleId:string}}){
  const db=createClient();
  const [{data:sale},{data:products}]=await Promise.all([
    db.from("sales").select("*,sale_items(*),creator:profiles!sales_created_by_fkey(full_name)").eq("id",params.saleId).single(),
    db.from("products").select("id,name,sku,price,promotional_price,variations,stock_tracking,stock_quantity,publication_status").neq("publication_status","archived").order("name"),
  ]);
  if(!sale)notFound();
  const record=sale as unknown as SaleRecord;
  return <><div className="print:hidden"><p className="eyebrow">Vente {record.reference}</p><h1 className="display mt-2 text-4xl">Détail de la vente</h1><p className="mb-7 mt-3 text-sm text-white/45">Créée par {record.creator?.full_name||"un administrateur"} le {new Date(record.created_at).toLocaleString("fr-MA")}.</p><SaleForm products={(products||[]) as Product[]} sale={record}/></div>
    <section className="card mx-auto mt-8 max-w-4xl bg-white p-8 text-slate-900 print:fixed print:inset-0 print:z-[100] print:m-0 print:max-w-none print:rounded-none print:border-0 print:p-10">
      <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6"><div><p className="text-2xl font-black tracking-[.12em]">DENTANOVA</p><p className="mt-1 text-sm text-slate-500">Équipements et fournitures dentaires · Casablanca</p></div><div className="text-right"><h2 className="text-2xl font-black">Bon de vente</h2><p className="mt-1 font-mono">{record.reference}</p><p className="text-sm text-slate-500">{new Date(record.sale_at).toLocaleString("fr-MA")}</p></div></div>
      <div className="grid gap-6 sm:grid-cols-2"><div><h3 className="font-black">Client</h3><p className="mt-2">{record.customer_name}</p><p>{record.customer_phone}</p><p>{record.delivery_address}, {record.neighbourhood}, Casablanca</p></div><div><h3 className="font-black">Suivi</h3><p className="mt-2">Paiement : {paymentMethodLabels[record.payment_method]} · {paymentStatusLabels[record.payment_status]}</p><p>Livraison : {deliveryStatusLabels[record.delivery_status]}</p><p>Vente : {saleStatusLabels[record.sale_status]}</p></div></div>
      <table className="mt-8 w-full text-left text-sm"><thead className="border-y border-slate-300"><tr><th className="py-3">Produit</th><th>Qté</th><th>Prix convenu</th><th>Remise</th><th className="text-right">Total</th></tr></thead><tbody>{record.sale_items?.map(item=><tr className="border-b border-slate-200" key={item.id}><td className="py-3"><b>{item.product_name}</b>{item.variation_label&&<small className="block text-slate-500">{item.variation_label}</small>}{item.is_custom&&<small className="block text-slate-500">Article personnalisé</small>}</td><td>{item.quantity}</td><td>{money(Number(item.unit_price))}</td><td>{money(Number(item.discount_amount))}</td><td className="text-right font-bold">{money(Number(item.line_total))}</td></tr>)}</tbody></table>
      <dl className="ml-auto mt-6 grid max-w-sm gap-2 text-sm"><Row label="Sous-total" value={record.subtotal}/><Row label="Remises sur articles" value={-record.discount_total}/><Row label="Remise globale" value={-Number(record.order_discount||0)}/><Row label="Livraison" value={record.delivery_charge}/><Row label="Total" value={record.total_amount} strong/><Row label="Montant payé" value={record.amount_paid}/><Row label="Solde restant" value={record.balance_due} strong/></dl>
      <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">Document commercial « Bon de vente ». Ce document ne constitue pas une facture fiscale.</p>
      <div className="mt-6"><PrintReceiptButton/></div>
    </section></>
}
function Row({label,value,strong}:{label:string;value:number;strong?:boolean}){return <div className={`flex justify-between ${strong?"border-t border-slate-300 pt-2 text-base font-black":""}`}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>}
