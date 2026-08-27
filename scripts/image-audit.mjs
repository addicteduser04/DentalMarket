#!/usr/bin/env node
import {createClient} from "@supabase/supabase-js";
import {buildPayload} from "./catalogue-import.mjs";

const BUCKET="product-images";
const PLACEHOLDER_PREFIX="/branding/";

export function percentile(values,fraction){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.ceil(fraction*sorted.length)-1];
}

export function storageObjectPath(value){
  try{
    const url=new URL(value),marker=`/storage/v1/object/public/${BUCKET}/`,index=url.pathname.indexOf(marker);
    return index<0?null:decodeURIComponent(url.pathname.slice(index+marker.length));
  }catch{return null}
}

export function collectReferences(payload){
  const references=[];
  for(const product of payload.products){
    product.images.forEach((url,index)=>references.push({url,usage:index===0?"product-main":"product-gallery",product:product.name}));
    product.variations.forEach(variation=>{if(variation.image_url)references.push({url:variation.image_url,usage:"variation",product:product.name})});
  }
  return references;
}

export async function listObjects(client,prefix=""){
  const objects=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await client.storage.from(BUCKET).list(prefix,{limit:1000,offset,sortBy:{column:"name",order:"asc"}});
    if(error)throw error;
    for(const entry of data||[]){
      const path=prefix?`${prefix}/${entry.name}`:entry.name;
      if(entry.id)objects.push({...entry,path});
      else objects.push(...await listObjects(client,path));
    }
    if(!data||data.length<1000)break;
  }
  return objects;
}

function bytes(value){return Number(value?.metadata?.size||0)}
function format(value){return String(value?.metadata?.mimetype||value?.metadata?.contentType||value?.name?.split(".").pop()||"unknown").toLowerCase()}

export function summarize(payload,objects=[]){
  const references=collectReferences(payload),uniqueUrls=[...new Set(references.map(item=>item.url))];
  const byPath=new Map(objects.map(object=>[object.path,object]));
  const referencedObjects=uniqueUrls.map(url=>({url,path:storageObjectPath(url)})).filter(item=>item.path).map(item=>({...item,object:byPath.get(item.path)}));
  const present=referencedObjects.filter(item=>item.object),sizes=present.map(item=>bytes(item.object)).filter(Boolean);
  const formats={};
  for(const item of present)formats[format(item.object)]=(formats[format(item.object)]||0)+1;
  const largest=present.sort((a,b)=>bytes(b.object)-bytes(a.object)).slice(0,15).map(item=>({path:item.path,bytes:bytes(item.object),format:format(item.object),cacheControl:item.object.metadata?.cacheControl||item.object.metadata?.cache_control||null}));
  return {
    mode:objects.length?"storage-metadata":"catalogue-references-only",
    products:payload.products.length,imageReferences:references.length,uniqueImageUrls:uniqueUrls.length,
    duplicateReferences:references.length-uniqueUrls.length,placeholderReferences:references.filter(item=>item.url.startsWith(PLACEHOLDER_PREFIX)).length,
    storage:{objectsInBucket:objects.length,referencedStorageObjects:referencedObjects.length,presentReferencedObjects:present.length,
      missingReferencedObjects:referencedObjects.filter(item=>!item.object).map(item=>item.path),externalOrLocalUrls:uniqueUrls.length-referencedObjects.length,
      totalBytes:sizes.reduce((sum,size)=>sum+size,0),medianBytes:percentile(sizes,.5),p75Bytes:percentile(sizes,.75),p90Bytes:percentile(sizes,.9),p95Bytes:percentile(sizes,.95),formats,largest,
      oversizedForCards:sizes.filter(size=>size>150000).length,largerThan500KB:sizes.filter(size=>size>500000).length,
      longCacheObjects:present.filter(item=>Number(item.object.metadata?.cacheControl||item.object.metadata?.cache_control||0)>=31536000).length,
      note:"Dimensions require reading image bodies and are intentionally omitted from metadata-only mode to avoid audit egress."
    }
  };
}

async function main(){
  let payload=await buildPayload();
  if(!process.argv.includes("--storage")){console.log(JSON.stringify(summarize(payload),null,2));return}
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase URL and a read-capable key are required for --storage");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:products,error}=await client.from("products").select("name,images,variations");
  if(error)throw error;
  payload={products:(products||[]).map(product=>({...product,images:product.images||[],variations:product.variations||[]}))};
  console.log(JSON.stringify(summarize(payload,await listObjects(client)),null,2));
}

if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{console.error(error.message);process.exitCode=1});
