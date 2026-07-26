export type WhatsAppItem = { name: string; variationLabel?: string; quantity: number; price: number };
export function buildWhatsAppMessage(items: WhatsAppItem[], customerName?: string) {
  const lines = items.map(i => `- ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity} — ${(i.price * i.quantity).toFixed(2)} MAD`);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return ["Bonjour, je souhaite commander :", ...lines, `Total estimé : ${total.toFixed(2)} MAD`, customerName ? `Client : ${customerName}` : ""].filter(Boolean).join("\n");
}
export function redirectToWhatsApp(items: WhatsAppItem[], customerName?: string) {
  const message = buildWhatsAppMessage(items, customerName);
  window.location.href = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""}?text=${encodeURIComponent(message)}`;
}
