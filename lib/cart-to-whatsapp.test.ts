import { describe, expect, it, vi } from "vitest";
import { beginValidatedWhatsAppHandoff, beginWhatsAppHandoff, buildWhatsAppMessage } from "./cart-to-whatsapp";
import { BUSINESS_WHATSAPP_DIGITS, createWhatsAppUrl, normalizeWhatsAppDigits } from "./whatsapp";
describe("buildWhatsAppMessage", () => {
  it("formats a single product with clean spacing and one delivery city", () => {
    const message = buildWhatsAppMessage([
      {name:"Louche",quantity:1,price:20},
    ],undefined,"Casablanca");

    expect(message).toBe([
      "Bonjour DENTANOVA, je souhaite commander :",
      "",
      "- Louche x1 — 20.00 MAD",
      "",
      "Total estimé : 20.00 MAD",
      "Ville de livraison : Casablanca",
    ].join("\n"));
    expect(message.match(/Ville de livraison : Casablanca/g)).toHaveLength(1);
    expect(message).not.toContain("Zone de livraison");
    expect(message).not.toContain("Livraison partout au Maroc");
  });

  it("formats multiple products, variations, quantities, total, customer, and city", () => {
    const message = buildWhatsAppMessage([
      {name:"Fraise",variationLabel:"1 mm",quantity:2,price:12.5},
      {name:"Miroir",quantity:1,price:20},
    ],"Sara","Casablanca");
    expect(message).toBe([
      "Bonjour DENTANOVA, je souhaite commander :",
      "",
      "- Fraise (1 mm) x2 — 25.00 MAD",
      "- Miroir x1 — 20.00 MAD",
      "",
      "Total estimé : 45.00 MAD",
      "Client : Sara",
      "Ville de livraison : Casablanca",
    ].join("\n"));
    expect(message.match(/Ville de livraison : Casablanca/g)).toHaveLength(1);
    expect(message).not.toContain("Zone de livraison");
    expect(message).not.toContain("Livraison partout au Maroc");
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

describe("mandatory delivery city",()=>{
  const items=[{name:"Sonde",itemType:"product" as const,quantity:2,price:35}];
  it.each(["","   "])("blocks WhatsApp and analytics for missing city %j",city=>{const log=vi.fn(),clear=vi.fn(),navigate=vi.fn();expect(beginValidatedWhatsAppHandoff(items,city,log,clear,navigate).ok).toBe(false);expect(log).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled()});
  it("opens WhatsApp and includes a valid city exactly once",()=>{let destination="";const result=beginValidatedWhatsAppHandoff(items,"Casablanca",()=>undefined,()=>undefined,url=>{destination=decodeURIComponent(url)});expect(result).toEqual({ok:true,city:"Casablanca"});expect(destination.match(/Ville de livraison : Casablanca/g)).toHaveLength(1);expect(destination).toContain("Sonde x2 — 70.00 MAD")});
  it("trims the city for both storage and message",()=>{let logged="",destination="";const result=beginValidatedWhatsAppHandoff(items,"  Rabat  ",city=>{logged=city},()=>undefined,url=>{destination=decodeURIComponent(url)});expect(result.city).toBe("Rabat");expect(logged).toBe("Rabat");expect(destination).toContain("Ville de livraison : Rabat")});
  it("preserves anonymous payload inputs",()=>{let city="";beginValidatedWhatsAppHandoff(items,"Fès",value=>{city=value;const payload={user_id:null,delivery_city:value};expect(payload).toEqual({user_id:null,delivery_city:"Fès"})},()=>undefined,()=>undefined);expect(city).toBe("Fès")});
  it("preserves authenticated name behavior and own UUID payload",()=>{let destination="";beginValidatedWhatsAppHandoff(items,"Agadir",city=>{expect({user_id:"own-session-uuid",delivery_city:city}).toEqual({user_id:"own-session-uuid",delivery_city:"Agadir"})},()=>undefined,url=>{destination=decodeURIComponent(url)},"Sara");expect(destination).toContain("Client : Sara")});
  it("keeps analytics failures non-blocking for valid cities",()=>{const navigate=vi.fn();expect(()=>beginValidatedWhatsAppHandoff(items,"Marrakech",()=>Promise.reject(new Error("offline")),()=>undefined,navigate)).not.toThrow();expect(navigate).toHaveBeenCalled()});
  it("preserves campaign attribution alongside delivery city",()=>{const payload={campaign_slug:"rentree-2026",delivery_city:"Oujda"};expect(payload).toEqual({campaign_slug:"rentree-2026",delivery_city:"Oujda"})});
  it("does not change unit prices, quantities, or totals",()=>{const message=buildWhatsAppMessage(items,undefined,"Tanger");expect(message).toContain("Sonde x2 — 70.00 MAD");expect(message).toContain("Total estimé : 70.00 MAD")});
});
