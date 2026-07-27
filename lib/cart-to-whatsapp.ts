export type WhatsAppItem = { name: string; variationLabel?: string; quantity: number; price: number };
import { createWhatsAppUrl, DELIVERY_CITY } from "./whatsapp";

export function buildWhatsAppMessage(items: WhatsAppItem[], customerName?: string) {
  const lines = items.map(i => `- ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity} — ${(i.price * i.quantity).toFixed(2)} MAD`);
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
