export type WhatsAppItem = {
  name:string; itemType?:"product"|"student_pack"; variationLabel?:string; quantity:number; price:number;
  university?:string; academicYear?:string; academicSession?:string; packCode?:string; componentSummary?:string[];
  optionalComponentSummary?:string[];
};
type WhatsAppMessageItem = Omit<WhatsAppItem,"quantity"> & {
  quantity?:number;
  item_type?:WhatsAppItem["itemType"];
  variation_label?:string;
  qty?:number;
};
import { createWhatsAppUrl } from "./whatsapp";

export function normalizeDeliveryCity(value:string){return value.trim()}

export function buildWhatsAppMessage(items: WhatsAppMessageItem[], customerName?: string, deliveryCity?:string) {
  const normalized = items.map(item => ({
    ...item,
    itemType:item.itemType ?? item.item_type,
    variationLabel:item.variationLabel ?? item.variation_label,
    quantity:item.quantity ?? item.qty ?? 0,
  }));
  const lines = normalized.flatMap(i => i.itemType==="student_pack"?[
    `- Pack étudiant : ${i.name} x${i.quantity} — ${(i.price*i.quantity).toFixed(2)} MAD`,
    i.university?`  Université : ${i.university}`:"",
    i.academicYear?`  Année : ${i.academicYear}`:"",
    i.academicSession?`  Session : ${i.academicSession}`:"",
    i.packCode?`  Code : ${i.packCode}`:"",
    i.componentSummary?.length?`  Contenu : ${i.componentSummary.join(", ")}`:"",
    i.optionalComponentSummary?.length?`  Options : ${i.optionalComponentSummary.join(", ")}`:"",
  ].filter(Boolean):[`- ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity} — ${(i.price * i.quantity).toFixed(2)} MAD`]);
  const total = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return [
    "Bonjour DENTANOVA, je souhaite commander :",
    "",
    ...lines,
    "",
    `Total estimé : ${total.toFixed(2)} MAD`,
    ...(customerName ? [`Client : ${customerName}`] : []),
    ...(deliveryCity ? [`Ville de livraison : ${normalizeDeliveryCity(deliveryCity)}`] : []),
  ].join("\n");
}

export function redirectToWhatsApp(items: WhatsAppItem[], customerName?: string,deliveryCity?:string) {
  window.location.href = createWhatsAppUrl(buildWhatsAppMessage(items, customerName,deliveryCity));
}

export function beginWhatsAppHandoff(
  items: WhatsAppItem[],
  startLogging: () => unknown,
  clearCart: () => void,
  navigate: (destination: string) => void,
  customerName?: string,
  deliveryCity?:string,
) {
  const destination = createWhatsAppUrl(buildWhatsAppMessage(items, customerName,deliveryCity));
  try {
    void Promise.resolve(startLogging()).catch(() => undefined);
  } catch {
    // Analytics must never affect the customer handoff.
  }
  clearCart();
  navigate(destination);
}

export function beginValidatedWhatsAppHandoff(
  items:WhatsAppItem[],deliveryCity:string,startLogging:(city:string)=>unknown,clearCart:()=>void,navigate:(destination:string)=>void,customerName?:string,
){
  const city=normalizeDeliveryCity(deliveryCity);
  if(!city)return {ok:false as const,city};
  beginWhatsAppHandoff(items,()=>startLogging(city),clearCart,navigate,customerName,city);
  return {ok:true as const,city};
}
