import {describe,expect,it} from "vitest";
import {randomBytes} from "node:crypto";
import sharp from "sharp";
import {assertProductionSafety,assertSelectedProductionBatch,createVariants,parseArgs,variantEligibility,variantPath} from "./generate-image-variants.mjs";

describe("image variant generation",()=>{
  it("uses deterministic, non-destructive paths",()=>expect(variantPath("catalogue/item.png","card")).toBe("catalogue/item.png.dn-card.webp"));
  it("requires confirmed, explicitly selected, bounded production batches",()=>{
    expect(()=>assertProductionSafety(parseArgs(["--apply"]),false)).toThrow(/explicit/);
    expect(()=>assertProductionSafety(parseArgs(["--apply","--confirm-production","--limit","51"]),true)).toThrow(/cannot exceed 50/);
    const apply=parseArgs(["--apply","--confirm-production","--manifest","batch.json"]);
    expect(()=>assertProductionSafety(apply,true)).not.toThrow();
    expect(()=>assertSelectedProductionBatch(apply,51)).toThrow(/cannot exceed 50/);
    expect(()=>assertSelectedProductionBatch(apply,50)).not.toThrow();
  });
  it("skips already-small efficient images",async()=>{
    const input=await sharp({create:{width:320,height:160,channels:3,background:"#ffffff"}}).png().toBuffer();
    const {results,skipped}=await createVariants(input) as unknown as {results:Record<string,{bytes:Buffer}>;skipped:Record<string,string>};
    expect(results).toEqual({});expect(skipped).toEqual({card:"source_already_small",detail:"source_already_small"});
  });
  it("preserves aspect ratio and creates justified variants without upscaling",async()=>{
    const input=await sharp(randomBytes(1600*800*3),{raw:{width:1600,height:800,channels:3}}).png().toBuffer();
    const {results}=await createVariants(input) as unknown as {results:Record<"card"|"detail",{bytes:Buffer;width:number;height:number}>};
    expect(results.card).toMatchObject({width:480,height:240});expect(results.detail).toMatchObject({width:1200,height:600});
    await expect(sharp(results.card.bytes).metadata()).resolves.toMatchObject({format:"webp",width:480,height:240});
  });
  it("uses both dimensions and bytes for conservative eligibility",()=>{
    expect(variantEligibility({width:320},20_000)).toEqual({card:false,detail:false});
    expect(variantEligibility({width:1600},250_000)).toEqual({card:true,detail:true});
  });
});
