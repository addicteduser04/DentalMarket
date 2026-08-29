import {describe,expect,it} from "vitest";
import {buildHeavyPlan,parseArgs} from "./plan-heavy-image-variants.mjs";

const base="https://example.supabase.co/storage/v1/object/public/product-images/";
describe("heavy storefront image planning",()=>{
  it("prioritizes heavy visible originals with missing variants",()=>{
    const plan=buildHeavyPlan({
      references:[
        {url:`${base}products/heavy.png`,usage:"product-main",owner:{type:"product",id:"p1"}},
        {url:`${base}products/small.jpg`,usage:"product-main",owner:{type:"product",id:"p2"}},
        {url:`${base}products/variation.png`,usage:"variation",owner:{type:"variation",productId:"p3"}},
      ],
      objects:[
        {path:"products/heavy.png",metadata:{size:900000}},
        {path:"products/small.jpg",metadata:{size:12000}},
        {path:"products/variation.png",metadata:{size:250000}},
      ],
      registry:{"products/heavy.png":["card"]},minBytes:150000,batchSize:40,
    });
    expect(plan.candidates).toEqual([
      expect.objectContaining({path:"products/heavy.png",missingVariants:["detail"],sourceBytes:900000}),
      expect.objectContaining({path:"products/variation.png",missingVariants:["card"],sourceBytes:250000}),
    ]);
  });
  it("caps generated production-sized manifests",()=>{
    expect(()=>parseArgs(["--output-dir","tmp","--batch-size","51"])).toThrow(/cannot exceed 50/);
    expect(parseArgs(["--output-dir","tmp","--batch-size","40"])).toMatchObject({batchSize:40,minBytes:150000});
  });
});
