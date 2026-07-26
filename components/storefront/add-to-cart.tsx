"use client";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/utils";
export function AddToCart({product,price}:{product:Product;price:number}){const [variation,setVariation]=useState(product.variations?.[0]);const [added,setAdded]=useState(false);const add=useCart(s=>s.add);const final=variation?Number(variation.price):price;return <div>
  {product.variations?.length>0&&<div className="mb-6"><label className="mb-2 block text-sm font-bold">Choisir une variation</label><div className="flex flex-wrap gap-2">{product.variations.map(v=><button key={v.label} onClick={()=>setVariation(v)} className={`rounded-full border px-4 py-2 text-sm ${variation?.label===v.label?"border-ink bg-ink text-white":"border-ink/15 bg-white"}`}>{v.label} · {money(Number(v.price))}</button>)}</div></div>}
  <button disabled={product.stock_status==="out_of_stock"} onClick={()=>{add({productId:product.id,slug:product.slug,name:product.name,image:product.images?.[0],variationLabel:variation?.label,price:final});setAdded(true);setTimeout(()=>setAdded(false),1600)}} className="button w-full disabled:cursor-not-allowed disabled:opacity-40">{added?<><Check size={19}/>Ajouté au panier</>:<><ShoppingBag size={19}/>Ajouter · {money(final)}</>}</button>
</div>}
