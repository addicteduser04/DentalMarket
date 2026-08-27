import {describe,expect,it} from "vitest";
import sharp from "sharp";
import {createVariants,variantPath} from "./generate-image-variants.mjs";

describe("image variant generation",()=>{
  it("uses deterministic, non-destructive paths",()=>expect(variantPath("catalogue/item.png","card")).toBe("catalogue/item.png.dn-card.webp"));
  it("preserves aspect ratio and does not upscale",async()=>{
    const input=await sharp({create:{width:320,height:160,channels:3,background:"#ffffff"}}).png().toBuffer();
    const {results}=await createVariants(input) as unknown as {results:Record<"card"|"detail",Buffer>};
    await expect(sharp(results.card).metadata()).resolves.toMatchObject({format:"webp",width:320,height:160});
    await expect(sharp(results.detail).metadata()).resolves.toMatchObject({format:"webp",width:320,height:160});
  });
});
