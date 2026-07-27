"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import {
  calculateSaleTotals,deliveryStatusLabels,paymentMethodLabels,paymentStatusLabels,
  productSalePrice,saleStatusLabels,validateSale,type DeliveryStatus,type PaymentMethod,
  type PaymentStatus,type SaleItemDraft,type SaleRecord,type SaleStatus,
} from "@/lib/sales";
import { money } from "@/lib/utils";

const localDate=(value?:string)=>value?new Date(value).toISOString().slice(0,16):new Date().toISOString().slice(0,16);
const newLine=():SaleItemDraft=>({key:crypto.randomUUID(),product_id:"",variation_id:"",product_name:"",quantity:1,unit_price:0,discount_amount:0,is_custom:false});

export function SaleForm({products,sale}:{products:Product[];sale?:SaleRecord}){
  const router=useRouter();
  const initialItems:SaleItemDraft[]=sale?.sale_items?.map(item=>({
    key:item.id,product_id:item.product_id||"",variation_id:item.variation_id||"",
    product_name:item.product_name,quantity:item.quantity,unit_price:Number(item.unit_price),
    discount_amount:Number(item.discount_amount),is_custom:item.is_custom,
  }))||[newLine()];
  const [items,setItems]=useState(initialItems),[saving,setSaving]=useState(false);
  const [message,setMessage]=useState(""),[errors,setErrors]=useState<Record<string,string>>({});
  const [deliveryCharge,setDeliveryCharge]=useState(Number(sale?.delivery_charge||0));
  const [orderDiscount,setOrderDiscount]=useState(Number(sale?.order_discount||0));
  const [amountPaid,setAmountPaid]=useState(Number(sale?.amount_paid||0));
  const totals=useMemo(()=>calculateSaleTotals(items,deliveryCharge,amountPaid,orderDiscount),[items,deliveryCharge,amountPaid,orderDiscount]);

  function update(index:number,patch:Partial<SaleItemDraft>){setItems(current=>current.map((line,i)=>i===index?{...line,...patch}:line))}
  function selectProduct(index:number,id:string){
    const product=products.find(entry=>entry.id===id);
    update(index,{product_id:id,variation_id:"",product_name:product?.name||"",unit_price:product?productSalePrice(product):0,is_custom:false});
  }
  function selectVariation(index:number,id:string){
    const product=products.find(entry=>entry.id===items[index].product_id);
    const variation=product?.variations?.find(entry=>entry.id===id);
    update(index,{variation_id:id,unit_price:product?productSalePrice(product,variation):0});
  }

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;
    const values=new FormData(event.currentTarget);
    const paymentStatus=String(values.get("payment_status")) as PaymentStatus;
    const fields={
      customer_name:String(values.get("customer_name")||""),customer_phone:String(values.get("customer_phone")||""),
      delivery_address:String(values.get("delivery_address")||""),neighbourhood:String(values.get("neighbourhood")||""),
      delivery_charge:deliveryCharge,amount_paid:amountPaid,order_discount:orderDiscount,payment_status:paymentStatus,
    };
    const validation=validateSale(items,fields);
    if(!validation.valid){setErrors(validation.errors);setMessage("Corrigez les champs signalés.");return}
    const nextStatus=String(values.get("sale_status")) as SaleStatus;
    if(nextStatus==="confirmed"&&sale?.sale_status!=="confirmed"&&!confirm("Confirmer cette vente et déduire le stock maintenant ?"))return;
    if(nextStatus==="cancelled"&&sale?.sale_status==="confirmed"&&!confirm("Annuler cette vente et restaurer son stock ?"))return;
    setErrors({});setSaving(true);setMessage("");
    const payload={
      ...fields,sale_at:new Date(String(values.get("sale_at"))).toISOString(),
      customer_note:String(values.get("customer_note")||""),whatsapp_reference:String(values.get("whatsapp_reference")||""),
      internal_note:String(values.get("internal_note")||""),payment_method:String(values.get("payment_method")) as PaymentMethod,
      delivery_status:String(values.get("delivery_status")) as DeliveryStatus,sale_status:nextStatus,
    };
    const rpcItems=items.map(({key,...item})=>item);
    const {data,error}=await createClient().rpc("save_manual_sale_v2",{p_sale_id:sale?.id||null,p_sale:payload,p_items:rpcItems});
    setSaving(false);
    if(error){setMessage(error.message.includes("stock")||error.message.includes("Stock")?"Stock insuffisant pour confirmer cette vente.":"Impossible d’enregistrer la vente. Vérifiez les informations.");return}
    setMessage("Vente enregistrée.");
    router.push(`/admin/sales/${data}`);router.refresh();
  }

  return <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="grid gap-5">
      <Section title="Client"><div className="grid gap-4 md:grid-cols-2">
        <Field name="customer_name" label="Nom complet" value={sale?.customer_name} error={errors.customer_name}/>
        <Field name="customer_phone" label="Téléphone WhatsApp" value={sale?.customer_phone} error={errors.customer_phone} placeholder="+212 6…"/>
        <Field name="delivery_address" label="Adresse de livraison" value={sale?.delivery_address} error={errors.delivery_address}/>
        <Field name="neighbourhood" label="Quartier · Casablanca" value={sale?.neighbourhood} error={errors.neighbourhood}/>
      </div><label className="admin-field mt-4">Note client facultative<textarea name="customer_note" rows={3} defaultValue={sale?.customer_note||""}/></label></Section>
      <Section title="Articles vendus">
        <div className="grid gap-4">{items.map((item,index)=>{
          const product=products.find(entry=>entry.id===item.product_id);
          return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4" key={item.key}>
            <div className="mb-3 flex items-center justify-between"><b>Article {index+1}</b><div className="flex gap-2"><label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={item.is_custom} onChange={event=>update(index,{is_custom:event.target.checked,product_id:"",variation_id:"",product_name:"",unit_price:0})}/>Article personnalisé</label><button type="button" aria-label="Retirer l’article" className="admin-icon-button danger" onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {item.is_custom?<label className="admin-field xl:col-span-2">Désignation<input value={item.product_name} onChange={event=>update(index,{product_name:event.target.value})}/></label>:<>
                <label className="admin-field">Produit<select value={item.product_id} onChange={event=>selectProduct(index,event.target.value)}><option value="">Sélectionner</option>{products.map(entry=><option value={entry.id} key={entry.id}>{entry.name}{entry.sku?` · ${entry.sku}`:""}</option>)}</select></label>
                <label className="admin-field">Variation<select value={item.variation_id} disabled={!product?.variations?.length} onChange={event=>selectVariation(index,event.target.value)}><option value="">Sans variation</option>{product?.variations?.filter(entry=>entry.is_active!==false).map(entry=><option value={entry.id} key={entry.id}>{entry.label} · stock {entry.stock_quantity??0}</option>)}</select></label>
              </>}
              <label className="admin-field">Quantité<input type="number" min="1" step="1" value={item.quantity} onChange={event=>update(index,{quantity:Number(event.target.value)})}/></label>
              <label className="admin-field">Prix unitaire convenu · MAD<input type="number" min="0" step=".01" value={item.unit_price} onChange={event=>update(index,{unit_price:Number(event.target.value)})}/></label>
              <label className="admin-field">Remise de ligne · MAD<input type="number" min="0" step=".01" value={item.discount_amount} onChange={event=>update(index,{discount_amount:Number(event.target.value)})}/></label>
              <div className="rounded-xl bg-white/[.04] p-3"><span className="text-xs text-white/40">Total ligne</span><p className="mt-2 font-black text-cyan-300">{money(Math.max(0,item.quantity*item.unit_price-item.discount_amount))}</p></div>
            </div>{errors[`item_${index}`]&&<p role="alert" className="mt-3 text-xs text-red-300">{errors[`item_${index}`]}</p>}
          </div>})}</div>
        {errors.items&&<p role="alert" className="mt-3 text-sm text-red-300">{errors.items}</p>}
        <button type="button" className="account-button-secondary mt-4" onClick={()=>setItems(current=>[...current,newLine()])}><Plus size={16}/>Ajouter un article</button>
      </Section>
      <Section title="Suivi WhatsApp et notes"><div className="grid gap-4 md:grid-cols-2"><Field name="whatsapp_reference" label="Conversation / référence WhatsApp" value={sale?.whatsapp_reference}/><label className="admin-field">Note administrative interne<textarea name="internal_note" rows={4} defaultValue={sale?.internal_note||""}/></label></div></Section>
    </div>
    <aside className="grid h-fit gap-5 xl:sticky xl:top-24">
      <Section title="Vente">
        {sale&&<div className="mb-4 rounded-xl bg-white/[.04] p-3 text-sm"><span className="text-white/40">Référence</span><b className="ml-2 text-cyan-300">{sale.reference}</b></div>}
        <Field name="sale_at" label="Date et heure" type="datetime-local" value={localDate(sale?.sale_at)}/>
        <Select name="sale_status" label="Statut de vente" value={sale?.sale_status||"draft"} options={saleStatusLabels}/>
        <Select name="delivery_status" label="Statut de livraison" value={sale?.delivery_status||"awaiting_preparation"} options={deliveryStatusLabels}/>
      </Section>
      <Section title="Paiement">
        <Select name="payment_method" label="Mode de paiement" value={sale?.payment_method||"cash"} options={paymentMethodLabels}/>
        <Select name="payment_status" label="Statut du paiement" value={sale?.payment_status||"unpaid"} options={paymentStatusLabels}/>
        <label className="admin-field mt-4">Montant payé · MAD<input type="number" min="0" step=".01" value={amountPaid} onChange={event=>setAmountPaid(Number(event.target.value))}/>{errors.amount_paid&&<small role="alert">{errors.amount_paid}</small>}</label>
      </Section>
      <Section title="Totaux">
        <label className="admin-field">Frais de livraison · MAD<input type="number" min="0" step=".01" value={deliveryCharge} onChange={event=>setDeliveryCharge(Number(event.target.value))}/></label>
        <label className="admin-field mt-4">Remise globale · MAD<input type="number" min="0" step=".01" value={orderDiscount} onChange={event=>setOrderDiscount(Number(event.target.value))}/>{errors.order_discount&&<small role="alert">{errors.order_discount}</small>}</label>
        <dl className="mt-5 grid gap-3 text-sm"><Total label="Sous-total" value={totals.subtotal}/><Total label="Remises totales" value={-totals.discount}/><Total label="Livraison" value={totals.delivery}/><Total label="Total final" value={totals.total} strong/><Total label="Payé" value={totals.paid}/><Total label="Solde restant" value={totals.balance} strong/></dl>
      </Section>
      <button disabled={saving} className="account-button w-full">{saving?<Loader2 className="animate-spin" size={17}/>:<Save size={17}/>}Enregistrer la vente</button>
      <Link href="/admin/sales" className="account-button-secondary justify-center">Retour aux ventes</Link>
    </aside>
    {message&&<div role="status" className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl p-4 shadow-2xl ${message.includes("Impossible")||message.includes("insuffisant")||message.includes("Corrigez")?"status-error":"status-success"}`}>{message}</div>}
  </form>
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="card p-5 md:p-6"><h2 className="text-lg font-black">{title}</h2><div className="mt-5">{children}</div></section>}
function Field({name,label,value,error,type="text",placeholder}:{name:string;label:string;value?:string|null;error?:string;type?:string;placeholder?:string}){return <label className="admin-field">{label}<input name={name} type={type} defaultValue={value||""} placeholder={placeholder}/>{error&&<small role="alert">{error}</small>}</label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:Record<string,string>}){return <label className="admin-field mt-4">{label}<select name={name} defaultValue={value}>{Object.entries(options).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>}
function Total({label,value,strong}:{label:string;value:number;strong?:boolean}){return <div className={`flex justify-between border-b border-white/[.07] pb-2 ${strong?"text-base font-black text-cyan-300":""}`}><dt>{label}</dt><dd>{money(value)}</dd></div>}
