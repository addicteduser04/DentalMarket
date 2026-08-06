"use client";

import Image from "next/image";
import {useEffect,useState} from "react";
import {cn} from "@/lib/utils";

const fallbackSrc="/branding/dentanova-product-placeholder.svg";

type ProductImageProps={src?:string|null;alt:string;sizes?:string;priority?:boolean;className?:string};

/** Catalogue media deliberately bypasses Vercel Image Optimization quotas. */
export function ProductImage({src,alt,sizes,priority=false,className}:ProductImageProps){
  const [resolvedSrc,setResolvedSrc]=useState(src||fallbackSrc);
  useEffect(()=>setResolvedSrc(src||fallbackSrc),[src]);
  return <Image src={resolvedSrc} alt={alt} fill sizes={sizes} priority={priority} unoptimized onError={()=>{if(resolvedSrc!==fallbackSrc)setResolvedSrc(fallbackSrc)}} className={cn("object-contain",className)}/>;
}
