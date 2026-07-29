"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export type CartItem = { key:string; productId:string; slug:string; name:string; image?:string; variationId?:string; variationSku?:string; variationLabel?:string; quantity:number; price:number };
type CartState = { items:CartItem[]; add:(item:Omit<CartItem,"quantity"|"key">)=>void; remove:(key:string)=>void; setQuantity:(key:string,qty:number)=>void; clear:()=>void };
export const useCart = create<CartState>()(persist((set) => ({
  items: [],
  add: item => set(s => { const key = `${item.productId}:${item.variationId ?? item.variationLabel ?? ""}`; const found=s.items.find(x=>x.key===key); return {items:found?s.items.map(x=>x.key===key?{...x,quantity:x.quantity+1}:x):[...s.items,{...item,key,quantity:1}]}; }),
  remove: key => set(s=>({items:s.items.filter(x=>x.key!==key)})),
  setQuantity: (key,quantity) => set(s=>({items:s.items.map(x=>x.key===key?{...x,quantity:Math.max(1,quantity)}:x)})),
  clear:()=>set({items:[]})
}), {name:"dentanova-cart"}));
