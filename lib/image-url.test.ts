import {describe,expect,it} from "vitest";
import {isPublicImageUrl,sanitizeProductImages} from "./image-url";

describe("public image URLs",()=>{
  it("rejects Windows paths imported from another computer",()=>{
    expect(isPublicImageUrl("/C:/Users/hp/Downloads/photo.webp")).toBe(false);
    expect(isPublicImageUrl("C:\\Users\\hp\\photo.webp")).toBe(false);
  });
  it("accepts public and remote URLs",()=>{
    expect(isPublicImageUrl("/images/photo.webp")).toBe(true);
    expect(isPublicImageUrl("https://dentalmarket.ma/photo.webp")).toBe(true);
  });
  it("removes invalid product and variation media",()=>{
    const product=sanitizeProductImages({images:["/C:/bad.webp","/images/good.webp"],variations:[{id:"v",label:"V",price:1,image_url:"C:\\bad.webp"}]} as any);
    expect(product.images).toEqual(["/images/good.webp"]);
    expect(product.variations[0].image_url).toBeNull();
  });
});
