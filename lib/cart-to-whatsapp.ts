export type WhatsAppItem = {
  name:string; itemType?:"product"|"student_pack"; variationLabel?:string; quantity:number; price:number;
  university?:string; academicYear?:string; academicSession?:string; packCode?:string; componentSummary?:string[];
};
import { createWhatsAppUrl, DELIVERY_CITY } from "./whatsapp";

export function buildWhatsAppMessage(items: WhatsAppItem[], customerName?: string) {
  const lines = items.flatMap(i => i.itemType==="student_pack"?[
    `- Pack étudiant : ${i.name} x${i.quantity} — ${(i.price*i.quantity).toFixed(2)} MAD`,
    i.university?`  Université : ${i.university}`:"",
    i.academicYear?`  Année : ${i.academicYear}`:"",
    i.academicSession?`  Session : ${i.academicSession}`:"",
    i.packCode?`  Code : ${i.packCode}`:"",
    i.componentSummary?.length?`  Contenu : ${i.componentSummary.join(", ")}`:"",
  ].filter(Boolean):[`- ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity} — ${(i.price * i.quantity).toFixed(2)} MAD`]);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return [
    "Bonjour DENTANOVA, je souhaite commander :",
    ...lines,
    `Total estimé : ${total.toFixed(2)} MAD`,
    customerName ? `Client : ${customerName}` : "",
    `Ville de livraison : ${DELIVERY_CITY}`,
    "La livraison est actuellement disponible exclusivement à Casablanca.",
  ].filter(Boolean).join("\n");
}

export function redirectToWhatsApp(items: WhatsAppItem[], customerName?: string) {
  window.location.href = createWhatsAppUrl(buildWhatsAppMessage(items, customerName));
}
