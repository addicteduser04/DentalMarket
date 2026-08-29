import {describe,expect,it} from "vitest";
import {mergeVariantRegistry} from "./verify-image-variants.mjs";

describe("verified image registry merging",()=>{
  it("adds only supplied verified variants without removing previous coverage",()=>{
    expect(mergeVariantRegistry({"a.png":["card"]},{"a.png":["detail"],"b.jpg":["card"]})).toEqual({"a.png":["card","detail"],"b.jpg":["card"]});
  });
});
