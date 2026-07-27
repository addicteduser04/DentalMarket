import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage } from "./cart-to-whatsapp";
import { BUSINESS_WHATSAPP_DIGITS, createWhatsAppUrl, normalizeWhatsAppDigits } from "./whatsapp";
describe("buildWhatsAppMessage", () => {
  it("formats multiple lines, variations, quantities, total, customer and Casablanca delivery", () => {
    const message = buildWhatsAppMessage([
      {name:"Fraise",variationLabel:"1 mm",quantity:2,price:12.5},
      {name:"Miroir",quantity:1,price:20},
    ],"Sara");
    expect(message).toContain("- Fraise (1 mm) x2 — 25.00 MAD");
    expect(message).toContain("- Miroir x1 — 20.00 MAD");
    expect(message).toContain("Total estimé : 45.00 MAD");
    expect(message).toContain("Client : Sara");
    expect(message).toContain("Ville de livraison : Casablanca");
    expect(message).toContain("exclusivement à Casablanca");
  });

  it("uses the canonical destination and URL-encodes the message", () => {
    const url = createWhatsAppUrl("Bonjour DENTANOVA\nCasablanca & matériel");
    expect(BUSINESS_WHATSAPP_DIGITS).toBe("212659547879");
    expect(url).toBe("https://wa.me/212659547879?text=Bonjour%20DENTANOVA%0ACasablanca%20%26%20mat%C3%A9riel");
    expect(normalizeWhatsAppDigits("+212 659 547 879")).toBe(BUSINESS_WHATSAPP_DIGITS);
  });
});
