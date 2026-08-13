import {describe,expect,it,vi} from "vitest";
import {logCartSubmission,type CartSubmissionPayload} from "./cart-submission-analytics";

const payload:CartSubmissionPayload={
  items:[{item_type:"product",product_id:"product-own-id",name:"Sonde",qty:2,price:35}],
  estimated_total:70,
  user_id:null,
  campaign_slug:"rentree-2026",
  delivery_city:"Casablanca",
};

describe("logCartSubmission",()=>{
  function clientWith(result:{error:null|{code:string}}|Promise<never>){
    const insert=vi.fn().mockReturnValue(result instanceof Promise?result:Promise.resolve(result));
    const from=vi.fn().mockReturnValue({insert});
    return {client:{from},from,insert};
  }

  it("inserts the approved payload directly into Supabase",async()=>{
    const {client,from,insert}=clientWith({error:null});
    await logCartSubmission(payload,client);
    expect(from).toHaveBeenCalledWith("cart_submissions");
    expect(insert).toHaveBeenCalledWith(payload);
    expect(typeof payload.items[0].price).toBe("number");
    expect(payload).not.toHaveProperty("client_fingerprint");
  });

  it("absorbs insert failures without rejecting",async()=>{
    const {client}=clientWith({error:{code:"42501"}});
    const warning=vi.spyOn(console,"warn").mockImplementation(()=>undefined);
    await expect(logCartSubmission(payload,client)).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith("Cart submission analytics failed",{code:"42501"});
    warning.mockRestore();
  });

  it("absorbs unavailable Supabase/network errors without rejecting",async()=>{
    const {client}=clientWith(Promise.reject(new Error("offline")));
    const warning=vi.spyOn(console,"warn").mockImplementation(()=>undefined);
    await expect(logCartSubmission(payload,client)).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith("Cart submission analytics unavailable");
    warning.mockRestore();
  });

  it("accepts only the authenticated user's resolved UUID",async()=>{
    const authenticated={...payload,user_id:"authenticated-user-own-uuid"};
    const {client,insert}=clientWith({error:null});
    await logCartSubmission(authenticated,client);
    expect(insert).toHaveBeenCalledWith(authenticated);
  });
});
