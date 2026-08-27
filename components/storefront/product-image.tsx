"use client";

import Image from "next/image";
import {useState} from "react";
import {cn} from "@/lib/utils";
import {productImageCandidates,type ProductImageVariant} from "@/lib/product-image-variants";

type ProductImageProps={src?:string|null;alt:string;sizes?:string;priority?:boolean;className?:string;variant?:ProductImageVariant};

/** Catalogue media deliberately bypasses Vercel Image Optimization quotas. */
export function ProductImage({src,alt,sizes,priority=false,className,variant="card"}:ProductImageProps){
  const candidates=productImageCandidates(src,variant),candidateKey=`${src||""}:${variant}`;
  const [failure,setFailure]=useState({key:candidateKey,index:0}),candidateIndex=failure.key===candidateKey?failure.index:0;
  const resolvedSrc=candidates[Math.min(candidateIndex,candidates.length-1)];
  return <Image src={resolvedSrc} alt={alt} fill sizes={sizes} priority={priority} loading={priority?"eager":"lazy"} unoptimized onError={()=>setFailure({key:candidateKey,index:Math.min(candidateIndex+1,candidates.length-1)})} className={cn("object-contain",className)}/>;
}
