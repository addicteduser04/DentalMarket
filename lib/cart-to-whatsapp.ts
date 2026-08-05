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
import { createWhatsAppUrl, DELIVERY_ZONE } from "./whatsapp";

export function buildWhatsAppMessage(items: WhatsAppMessageItem[], customerName?: string) {
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
    ...lines,
    `Total estimé : ${total.toFixed(2)} MAD`,
    customerName ? `Client : ${customerName}` : "",
    `Zone de livraison : ${DELIVERY_ZONE}`,
    "Livraison partout au Maroc.",
  ].filter(Boolean).join("\n");
}

export function redirectToWhatsApp(items: WhatsAppItem[], customerName?: string) {
  window.location.href = createWhatsAppUrl(buildWhatsAppMessage(items, customerName));
}
