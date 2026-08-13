import { describe, expect, it } from "vitest";
import { beginWhatsAppHandoff, buildWhatsAppMessage } from "./cart-to-whatsapp";
import { BUSINESS_WHATSAPP_DIGITS, createWhatsAppUrl, normalizeWhatsAppDigits } from "./whatsapp";
describe("buildWhatsAppMessage", () => {
  it("formats multiple lines, variations, quantities, total, customer and Morocco-wide delivery", () => {
    const message = buildWhatsAppMessage([
      {name:"Fraise",variationLabel:"1 mm",quantity:2,price:12.5},
      {name:"Miroir",quantity:1,price:20},
    ],"Sara");
    expect(message).toContain("- Fraise (1 mm) x2 — 25.00 MAD");
    expect(message).toContain("- Miroir x1 — 20.00 MAD");
    expect(message).toContain("Total estimé : 45.00 MAD");
    expect(message).toContain("Client : Sara");
    expect(message).toContain("Zone de livraison : Partout au Maroc");
    expect(message).toContain("Livraison partout au Maroc");
  });

  it("uses the canonical destination and URL-encodes the message", () => {
    const url = createWhatsAppUrl("Bonjour DENTANOVA\nCasablanca & matériel");
    expect(BUSINESS_WHATSAPP_DIGITS).toBe("212612133240");
    expect(url).toBe("https://wa.me/212612133240?text=Bonjour%20DENTANOVA%0ACasablanca%20%26%20mat%C3%A9riel");
    expect(normalizeWhatsAppDigits("+212 612 133 240")).toBe(BUSINESS_WHATSAPP_DIGITS);
  });

  it("formats the snake-case items returned by the cart submission API", () => {
    const message = buildWhatsAppMessage([
      {item_type:"product",name:"Sonde",variation_label:"Fine",qty:2,price:35},
      {item_type:"student_pack",name:"Pack clinique",qty:1,price:220,packCode:"PACK-1"},
    ]);

    expect(message).toContain("- Sonde (Fine) x2 — 70.00 MAD");
    expect(message).toContain("- Pack étudiant : Pack clinique x1 — 220.00 MAD");
    expect(message).toContain("Total estimé : 290.00 MAD");
    expect(message).not.toContain("NaN");
  });

  it("does not let a stale deployment environment override the canonical destination", () => {
    const previous = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "212659547879";

    try {
      expect(createWhatsAppUrl()).toBe("https://wa.me/212612133240");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
      else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = previous;
    }
  });
});

describe("beginWhatsAppHandoff", () => {
  const items = [{name:"Sonde",itemType:"product" as const,quantity:1,price:35}];

  it.each([
    ["successful analytics",()=>Promise.resolve()],
    ["failed analytics",()=>Promise.reject(new Error("insert failed"))],
    ["unavailable analytics",()=>{throw new Error("unavailable")}],
  ])("opens WhatsApp without customer-facing failure when %s",(_scenario,startLogging)=>{
    let cleared=false;
    let destination="";
    beginWhatsAppHandoff(items,startLogging,()=>{cleared=true},url=>{destination=url});
    expect(cleared).toBe(true);
    expect(destination).toContain("https://wa.me/212612133240?text=");
    expect(decodeURIComponent(destination)).toContain("Sonde x1");
  });

  it("preserves the existing authenticated customer-name behavior",()=>{
    let destination="";
    beginWhatsAppHandoff(items,()=>Promise.resolve(),()=>undefined,url=>{destination=url},"Sara");
    expect(decodeURIComponent(destination)).toContain("Client : Sara");
  });
});
