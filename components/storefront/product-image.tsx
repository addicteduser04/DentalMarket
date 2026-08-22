"use client";

import Image from "next/image";
import {useState} from "react";
import {cn} from "@/lib/utils";

const fallbackSrc="/branding/dentanova-product-placeholder.svg";

type ProductImageProps={src?:string|null;alt:string;sizes?:string;priority?:boolean;className?:string};

/** Catalogue media deliberately bypasses Vercel Image Optimization quotas. */
export function ProductImage({src,alt,sizes,priority=false,className}:ProductImageProps){
  const [failedSrc,setFailedSrc]=useState<string|null>(null),requestedSrc=src||fallbackSrc,resolvedSrc=failedSrc===requestedSrc?fallbackSrc:requestedSrc;
  return <Image src={resolvedSrc} alt={alt} fill sizes={sizes} priority={priority} unoptimized onError={()=>{if(resolvedSrc!==fallbackSrc)setFailedSrc(requestedSrc)}} className={cn("object-contain",className)}/>;
}
