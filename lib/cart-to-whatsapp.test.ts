import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage } from "./cart-to-whatsapp";
describe("buildWhatsAppMessage", () => {
  it("formats lines, variation and total", () => expect(buildWhatsAppMessage([{name:"Fraise",variationLabel:"1 mm",quantity:2,price:12.5}],"Sara")).toBe("Bonjour, je souhaite commander :\n- Fraise (1 mm) x2 — 25.00 MAD\nTotal estimé : 25.00 MAD\nClient : Sara"));
});
