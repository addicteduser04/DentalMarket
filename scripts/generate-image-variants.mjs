#!/usr/bin/env node
import {mkdir,readFile,readdir,writeFile} from "node:fs/promises";
import {basename,join,resolve} from "node:path";
import sharp from "sharp";
import {createClient} from "@supabase/supabase-js";

const BUCKET="product-images",CACHE_CONTROL="31536000";
const VARIANTS={card:{width:480,quality:78},detail:{width:1200,quality:82}};
const args=new Set(process.argv.slice(2));
const value=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1]};
export const variantPath=(path,variant)=>`${path}.dn-${variant}.webp`;

export async function createVariants(input){
  const image=sharp(input,{failOn:"warning"}).rotate(),metadata=await image.metadata(),results={};
  for(const [name,settings] of Object.entries(VARIANTS)){
    results[name]=await image.clone().resize({width:settings.width,withoutEnlargement:true,fit:"inside"}).webp({quality:settings.quality,effort:5}).toBuffer();
  }
  return {metadata:{format:metadata.format,width:metadata.width,height:metadata.height,orientation:metadata.orientation},results};
}

async function localMode(inputDir,outputDir){
  const names=(await readdir(inputDir)).filter(name=>/\.(jpe?g|png|webp)$/i.test(name)),report=[];
  await mkdir(outputDir,{recursive:true});
  for(const name of names){
    try{const {metadata,results}=await createVariants(await readFile(join(inputDir,name)));for(const [variant,bytes] of Object.entries(results))await writeFile(join(outputDir,`${name}.dn-${variant}.webp`),bytes);report.push({source:name,status:"generated",metadata,bytes:Object.fromEntries(Object.entries(results).map(([key,bytes])=>[key,bytes.length]))})}
    catch(error){report.push({source:name,status:"skipped",reason:error.message})}
  }
  console.log(JSON.stringify({mode:"local",inputDir,outputDir,files:names.length,report},null,2));
}

function objectPath(url){try{const marker=`/storage/v1/object/public/${BUCKET}/`,path=new URL(url).pathname,index=path.indexOf(marker);return index<0?null:decodeURIComponent(path.slice(index+marker.length))}catch{return null}}
async function productionMode(){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Production generation requires Supabase URL and secret key environment variables");
  const apply=args.has("--apply");
  if(apply&&!args.has("--confirm-production"))throw new Error("Upload requires --apply --confirm-production");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{data:products,error:productError},{data:packs,error:packError}]=await Promise.all([
    client.from("products").select("images,variations"),client.from("student_packs").select("image_url,gallery")
  ]);
  if(productError||packError)throw productError||packError;
  const urls=[];
  for(const product of products||[]){urls.push(...(product.images||[]));for(const variation of product.variations||[])if(variation.image_url)urls.push(variation.image_url)}
  for(const pack of packs||[]){if(pack.image_url)urls.push(pack.image_url);urls.push(...(pack.gallery||[]))}
  const paths=[...new Set(urls.map(objectPath).filter(Boolean).filter(path=>!path.includes(".dn-card.webp")&&!path.includes(".dn-detail.webp")))];
  if(!apply){console.log(JSON.stringify({mode:"dry-run",originals:paths.length,variantsPlanned:paths.length*2,naming:"<original-path>.dn-{card|detail}.webp",cacheControl:CACHE_CONTROL},null,2));return}
  const report=[];
  for(const path of paths){
    try{
      const targets=Object.keys(VARIANTS).map(variant=>variantPath(path,variant));
      const existing=await Promise.all(targets.map(target=>client.storage.from(BUCKET).list(target.slice(0,target.lastIndexOf("/")),{search:basename(target),limit:1})));
      if(existing.every((result,index)=>result.data?.some(item=>item.name===basename(targets[index])))){report.push({path,status:"exists"});continue}
      const {data,error}=await client.storage.from(BUCKET).download(path);if(error)throw error;
      const {metadata,results}=await createVariants(Buffer.from(await data.arrayBuffer()));
      const uploaded={};
      for(const [variant,bytes] of Object.entries(results)){
        const target=variantPath(path,variant),result=await client.storage.from(BUCKET).upload(target,bytes,{contentType:"image/webp",cacheControl:CACHE_CONTROL,upsert:false});
        if(result.error&&!/already exists/i.test(result.error.message))throw result.error;uploaded[variant]=bytes.length;
      }
      report.push({path,status:"generated",metadata,bytes:uploaded});
    }catch(error){report.push({path,status:"skipped",reason:error.message})}
  }
  console.log(JSON.stringify({mode:"uploaded",originals:paths.length,generated:report.filter(item=>item.status==="generated").length,existing:report.filter(item=>item.status==="exists").length,skipped:report.filter(item=>item.status==="skipped").length,report},null,2));
}

async function main(){
  const input=value("--input-dir"),output=value("--output-dir");
  if(input||output){if(!input||!output)throw new Error("Local mode requires --input-dir and --output-dir");await localMode(resolve(input),resolve(output))}
  else await productionMode();
}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{console.error(error.message);process.exitCode=1});
