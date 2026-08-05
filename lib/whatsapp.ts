export const BUSINESS_WHATSAPP_DIGITS = "212612133240";
export const BUSINESS_WHATSAPP_DISPLAY = "+212 612 133 240";
export const DELIVERY_ZONE = "Partout au Maroc";

export function normalizeWhatsAppDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function getBusinessWhatsAppDigits() {
  return BUSINESS_WHATSAPP_DIGITS;
}

export function createWhatsAppUrl(message?: string) {
  const base = `https://wa.me/${getBusinessWhatsAppDigits()}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
