import { describe, expect, it } from "vitest";
// The production importer is intentionally plain ESM so it runs without a TS loader.
// @ts-expect-error Vitest resolves the adjacent ESM module at runtime.
import { buildPayload, parseCsv } from "./catalogue-import.mjs";

type ImportedVariation = {id:string;price:number};
type ImportedProduct = {
  import_key:string; slug:string; price:number; promotional_price:number|null;
  variations:ImportedVariation[];
};

describe("catalogue importer", () => {
  it("parses quoted commas and multiline fields", () => {
    expect(parseCsv('a,b\n"x,y","line 1\nline 2"\n')).toEqual([{a:"x,y",b:"line 1\nline 2"}]);
  });

  it("reconciles the authoritative source files", async () => {
    const payload = await buildPayload();
    expect(payload.products).toHaveLength(196);
    expect(payload.products.flatMap((product:ImportedProduct) => product.variations)).toHaveLength(607);
    expect(new Set(payload.products.map((product:ImportedProduct) => product.import_key)).size).toBe(196);
    expect(new Set(payload.products.map((product:ImportedProduct) => product.slug)).size).toBe(196);
    expect(payload.products.every((product:ImportedProduct) => product.price >= 0)).toBe(true);
    expect(payload.products.every((product:ImportedProduct) =>
      product.promotional_price === null || product.promotional_price < product.price
    )).toBe(true);
    expect(payload.products.flatMap((product:ImportedProduct) => product.variations).every((variation:ImportedVariation) =>
      variation.id && variation.price >= 0
    )).toBe(true);
  });
});
