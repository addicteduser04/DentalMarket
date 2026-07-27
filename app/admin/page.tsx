import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type { SaleItemRecord, SaleRecord } from "@/lib/sales";

export default async function AdminHome(){
  const db=createClient(),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),month=new Date(now.getFullYear(),now.getMonth(),1);
  const [{data:salesData},{data:itemsData},{data:productsData}]=await Promise.all([
    db.from("sales").select("id,sale_at,total_amount,balance_due,delivery_status,sale_status").gte("sale_at",month.toISOString()),
    db.from("sale_items").select("product_id,product_name,quantity,sale:sales!inner(sale_status,sale_at)").gte("sale.sale_at",month.toISOString()).eq("sale.sale_status","confirmed"),
    db.from("products").select("id,name,sku,stock_tracking,stock_quantity,low_stock_threshold,variations,publication_status").neq("publication_status","archived"),
  ]);
  const sales=(salesData||[]) as unknown as SaleRecord[],items=(itemsData||[]) as unknown as (SaleItemRecord&{sale:{sale_status:string;sale_at:string}})[],products=(productsData||[]) as unknown as Product[];
  const commercial=sales.filter(sale=>sale.sale_status==="confirmed");
  const todaySales=commercial.filter(sale=>new Date(sale.sale_at)>=today);
  const revenue=commercial.reduce((sum,sale)=>sum+Number(sale.total_amount),0);
  const outstanding=commercial.reduce((sum,sale)=>sum+Number(sale.balance_due),0);
  const awaiting=commercial.filter(sale=>!["delivered","cancelled"].includes(sale.delivery_status)).length;
  const sold=new Map<string,{name:string;quantity:number}>();
  items.forEach(item=>{const key=item.product_id||item.product_name,current=sold.get(key)||{name:item.product_name,quantity:0};current.quantity+=Number(item.quantity);sold.set(key,current)});
  const lowStock=products.filter(product=>product.stock_tracking&&Number(product.stock_quantity||0)<=Number(product.low_stock_threshold||0));
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Pilotage DENTALNOVA</p><h1 className="display mt-2 text-4xl">Vue d’ensemble</h1></div><Link href="/admin/sales/new" className="account-button">Enregistrer une vente</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Ventes aujourd’hui" value={todaySales.length}/><Metric label="Ventes ce mois" value={commercial.length}/><Metric label="Revenu ce mois" value={money(revenue)}/><Metric label="Solde à recevoir" value={money(outstanding)}/><Metric label="À livrer" value={awaiting}/></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <section className="card p-6"><h2 className="display text-2xl">Produits les plus vendus</h2><div className="mt-4 grid gap-2">{[...sold.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,10).map((entry,index)=><div className="flex justify-between border-b border-white/10 py-2 text-sm" key={entry.name}><span>{index+1}. {entry.name}</span><b>{entry.quantity}</b></div>)}{!sold.size&&<p className="py-5 text-sm text-white/45">Les ventes confirmées apparaîtront ici.</p>}</div></section>
      <section className="card p-6"><div className="flex items-center justify-between"><h2 className="display text-2xl">Stock faible</h2><Link href="/admin/products?stock=in_stock" className="text-sm font-bold text-cyan-300">Gérer le stock</Link></div><div className="mt-4 grid gap-2">{lowStock.slice(0,10).map(product=><div className="flex justify-between border-b border-white/10 py-2 text-sm" key={product.id}><span>{product.name}{product.sku&&<small className="ml-2 text-white/35">{product.sku}</small>}</span><b className="text-amber-300">{product.stock_quantity||0}</b></div>)}{!lowStock.length&&<p className="py-5 text-sm text-white/45">Aucun produit suivi sous son seuil d’alerte.</p>}</div></section>
    </div>
  </>
}
function Metric({label,value}:{label:string;value:number|string}){return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wide text-white/40">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>}
