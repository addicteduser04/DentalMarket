import type { Product, Variation } from "@/lib/types";

export type PaymentMethod="cash"|"bank_transfer"|"cash_on_delivery"|"other";
export type PaymentStatus="unpaid"|"partially_paid"|"paid"|"refunded";
export type DeliveryStatus="awaiting_preparation"|"ready"|"out_for_delivery"|"delivered"|"cancelled";
export type SaleStatus="draft"|"confirmed"|"cancelled";

export type SaleItemDraft={
  key:string; product_id:string; variation_id:string; product_name:string;
  quantity:number; unit_price:number; discount_amount:number; is_custom:boolean;
};
export type SaleTotals={subtotal:number;discount:number;delivery:number;total:number;paid:number;balance:number};
export type SaleRecord={
  id:string;reference:string;sale_at:string;customer_name:string;customer_phone:string;
  delivery_address:string;neighbourhood:string;customer_note?:string|null;
  whatsapp_reference?:string|null;internal_note?:string|null;subtotal:number;
  discount_total:number;order_discount?:number;delivery_charge:number;total_amount:number;amount_paid:number;
  balance_due:number;payment_method:PaymentMethod;payment_status:PaymentStatus;
  delivery_status:DeliveryStatus;sale_status:SaleStatus;inventory_applied:boolean;
  created_by:string;updated_by:string;created_at:string;updated_at:string;
  sale_items?:SaleItemRecord[];creator?:{full_name:string|null}|null;
};
export type SaleItemRecord=Omit<SaleItemDraft,"key"> & {
  id:string;sale_id:string;variation_label?:string|null;line_total:number;
};

export const paymentMethodLabels:Record<PaymentMethod,string>={
  cash:"Espèces",bank_transfer:"Virement bancaire",cash_on_delivery:"Paiement à la livraison",other:"Autre",
};
export const paymentStatusLabels:Record<PaymentStatus,string>={
  unpaid:"Non payé",partially_paid:"Partiellement payé",paid:"Payé",refunded:"Remboursé",
};
export const deliveryStatusLabels:Record<DeliveryStatus,string>={
  awaiting_preparation:"En attente de préparation",ready:"Prête",out_for_delivery:"En livraison",delivered:"Livrée",cancelled:"Annulée",
};
export const saleStatusLabels:Record<SaleStatus,string>={
  draft:"Brouillon",confirmed:"Confirmée",cancelled:"Annulée",
};

const cents=(value:number)=>Math.round((Number.isFinite(value)?value:0)*100)/100;
export function calculateSaleTotals(items:SaleItemDraft[],deliveryCharge:number,amountPaid:number,orderDiscount=0):SaleTotals{
  const subtotal=cents(items.reduce((sum,item)=>sum+Math.max(0,item.quantity)*Math.max(0,item.unit_price),0));
  const discount=cents(items.reduce((sum,item)=>sum+Math.max(0,item.discount_amount),0)+Math.max(0,orderDiscount));
  const delivery=cents(Math.max(0,deliveryCharge));
  const total=cents(Math.max(0,subtotal-discount+delivery));
  const paid=cents(Math.max(0,amountPaid));
  return {subtotal,discount,delivery,total,paid,balance:cents(Math.max(0,total-paid))};
}

export function validateSale(items:SaleItemDraft[],fields:{
  customer_name:string;customer_phone:string;delivery_address:string;neighbourhood:string;
  delivery_charge:number;amount_paid:number;order_discount?:number;payment_status:PaymentStatus;
}){
  const errors:Record<string,string>={};
  if(fields.customer_name.trim().length<2)errors.customer_name="Saisissez le nom complet.";
  if(!/^[0-9+ ()-]{8,24}$/.test(fields.customer_phone.trim()))errors.customer_phone="Saisissez un numéro WhatsApp valide.";
  if(fields.delivery_address.trim().length<4)errors.delivery_address="Saisissez l’adresse de livraison.";
  if(fields.neighbourhood.trim().length<2)errors.neighbourhood="Saisissez le quartier à Casablanca.";
  if(!items.length)errors.items="Ajoutez au moins un article.";
  items.forEach((item,index)=>{
    if(item.quantity<1||!Number.isInteger(item.quantity))errors[`item_${index}`]="La quantité doit être un entier positif.";
    if(item.unit_price<0||item.discount_amount<0||item.discount_amount>item.unit_price*item.quantity)errors[`item_${index}`]="Vérifiez le prix et la remise.";
    if(item.is_custom&&!item.product_name.trim())errors[`item_${index}`]="Nommez l’article personnalisé.";
    if(!item.is_custom&&!item.product_id)errors[`item_${index}`]="Sélectionnez un produit.";
  });
  const lineDiscount=items.reduce((sum,item)=>sum+Math.max(0,item.discount_amount),0);
  if(Number(fields.order_discount||0)>Math.max(0,totalsBeforeDiscount(items)-lineDiscount))errors.order_discount="La remise globale dépasse le montant disponible.";
  const totals=calculateSaleTotals(items,fields.delivery_charge,fields.amount_paid,fields.order_discount);
  if(fields.amount_paid>totals.total&&fields.payment_status!=="refunded")errors.amount_paid="Le montant payé dépasse le total.";
  return {valid:Object.keys(errors).length===0,errors,totals};
}

function totalsBeforeDiscount(items:SaleItemDraft[]){return items.reduce((sum,item)=>sum+Math.max(0,item.quantity)*Math.max(0,item.unit_price),0)}

export function productSalePrice(product:Product,variation?:Variation){
  return Number(variation?.price??product.promotional_price??product.price??0);
}
