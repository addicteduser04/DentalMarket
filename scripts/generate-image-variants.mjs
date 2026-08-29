#!/usr/bin/env node
import {mkdir,readFile,readdir,writeFile} from "node:fs/promises";
import {basename,join,resolve} from "node:path";
import sharp from "sharp";
import {createClient} from "@supabase/supabase-js";

const BUCKET="product-images",CACHE_CONTROL="31536000",MAX_PRODUCTION_BATCH=50;
const VARIANTS={card:{width:480,quality:78},detail:{width:1200,quality:82}};
const CARD_MIN_BYTES=150_000,DETAIL_MIN_BYTES=200_000,LARGE_SOURCE_BYTES=300_000,MIN_SAVINGS=.10;

export const variantPath=(path,variant)=>`${path}.dn-${variant}.webp`;

export function variantEligibility(metadata,sourceBytes){
  const width=Number(metadata.width||0);
  return {
    card:width>VARIANTS.card.width||sourceBytes>CARD_MIN_BYTES,
    detail:(width>VARIANTS.detail.width&&sourceBytes>DETAIL_MIN_BYTES)||(width>VARIANTS.card.width&&sourceBytes>LARGE_SOURCE_BYTES),
  };
}

export async function createVariants(input){
  const sourceBytes=input.length,image=sharp(input,{failOn:"warning"}).rotate(),metadata=await image.metadata();
  if(!metadata.width||!metadata.height)throw new Error("Image dimensions are unavailable");
  const eligible=variantEligibility(metadata,sourceBytes),results={},skipped={};
  for(const [name,settings] of Object.entries(VARIANTS)){
    if(!eligible[name]){skipped[name]="source_already_small";continue}
    const bytes=await image.clone().resize({width:settings.width,withoutEnlargement:true,fit:"inside"}).webp({quality:settings.quality,effort:5}).toBuffer();
    if(bytes.length>=sourceBytes*(1-MIN_SAVINGS)){skipped[name]="insufficient_savings";continue}
    const output=await sharp(bytes).metadata();
    results[name]={bytes,width:output.width,height:output.height};
  }
  return {sourceBytes,metadata:{format:metadata.format,width:metadata.width,height:metadata.height,orientation:metadata.orientation},results,skipped};
}

export function parseArgs(argv){
  const flags=new Set(argv),value=name=>{const index=argv.indexOf(name);return index<0?null:argv[index+1]};
  const list=name=>(value(name)||"").split(",").map(item=>item.trim()).filter(Boolean);
  const limit=value("--limit")==null?null:Number.parseInt(value("--limit"),10);
  if(limit!==null&&(!Number.isInteger(limit)||limit<1))throw new Error("--limit must be a positive integer");
  return {apply:flags.has("--apply"),confirm:flags.has("--confirm-production"),inspect:flags.has("--inspect"),limit,
    paths:list("--paths"),productIds:list("--product-ids"),manifest:value("--manifest"),inputDir:value("--input-dir"),outputDir:value("--output-dir")};
}

export function assertProductionSafety(options,hasSelector){
  if(options.apply&&(!options.confirm||!hasSelector))throw new Error("Upload requires --apply --confirm-production and an explicit --limit, --paths, --manifest, or --product-ids selector");
  if(options.apply&&options.limit&&options.limit>MAX_PRODUCTION_BATCH)throw new Error(`Production --limit cannot exceed ${MAX_PRODUCTION_BATCH}`);
}

export function assertSelectedProductionBatch(options,count){
  if(options.apply&&count>MAX_PRODUCTION_BATCH)throw new Error(`Production selection cannot exceed ${MAX_PRODUCTION_BATCH} source objects; split the manifest into smaller batches`);
}

async function readSelectionManifest(file){
  if(!file)return [];
  const parsed=JSON.parse(await readFile(resolve(file),"utf8")),items=Array.isArray(parsed)?parsed:parsed.paths;
  if(!Array.isArray(items))throw new Error("Selection manifest must be an array or contain a paths array");
  return items.map(item=>typeof item==="string"?item:item.path).filter(Boolean);
}

function objectPath(url){try{const marker=`/storage/v1/object/public/${BUCKET}/`,path=new URL(url).pathname,index=path.indexOf(marker);return index<0?null:decodeURIComponent(path.slice(index+marker.length))}catch{return null}}

async function localDirectoryMode(inputDir,outputDir){
  const names=(await readdir(inputDir)).filter(name=>/\.(jpe?g|png|webp)$/i.test(name)),report=[];
  await mkdir(outputDir,{recursive:true});
  for(const name of names)report.push(await processBuffer({path:name,input:await readFile(join(inputDir,name)),mode:"local",outputDir}));
  await finishReport({mode:"local",considered:names.length,report,outputDir});
}

async function processBuffer({path,input,mode,outputDir,client,existing=new Set()}){
  try{
    const analysis=await createVariants(input),outputs=[];
    if(mode==="inspect"){await mkdir(outputDir,{recursive:true});await writeFile(join(outputDir,`source-${basename(path)}`),input)}
    for(const variant of Object.keys(VARIANTS)){
      const target=variantPath(path,variant),generated=analysis.results[variant];
      if(existing.has(target)){outputs.push({variant,path:target,status:"existing",bytes:0});continue}
      if(!generated){outputs.push({variant,path:target,status:"skipped",reason:analysis.skipped[variant],bytes:0});continue}
      if(mode==="apply"){
        const result=await client.storage.from(BUCKET).upload(target,generated.bytes,{contentType:"image/webp",cacheControl:CACHE_CONTROL,upsert:false});
        if(result.error){if(/already exists/i.test(result.error.message)){outputs.push({variant,path:target,status:"existing",bytes:0});continue}throw result.error}
      }else{
        await mkdir(outputDir,{recursive:true});
        await writeFile(join(outputDir,basename(target)),generated.bytes);
      }
      outputs.push({variant,path:target,status:"generated",bytes:generated.bytes.length,width:generated.width,height:generated.height});
    }
    return {path,status:"processed",sourceBytes:analysis.sourceBytes,source:analysis.metadata,outputs};
  }catch(error){return {path,status:"failed",sourceBytes:input?.length||0,error:error.message,outputs:[]}}
}

function summarizeReport({mode,considered,report}){
  const outputs=report.flatMap(item=>item.outputs||[]),generated=outputs.filter(item=>item.status==="generated"),originalBytes=report.reduce((sum,item)=>sum+(item.sourceBytes||0),0);
  const cardBytes=generated.filter(item=>item.variant==="card").reduce((sum,item)=>sum+item.bytes,0),detailBytes=generated.filter(item=>item.variant==="detail").reduce((sum,item)=>sum+item.bytes,0);
  const cardSources=report.filter(item=>item.outputs?.some(output=>output.variant==="card"&&output.status==="generated")).reduce((sum,item)=>sum+item.sourceBytes,0);
  return {mode,sourceObjectsConsidered:considered,variantsPlanned:considered*2,variantsGenerated:generated.length,
    variantsSkipped:outputs.filter(item=>item.status!=="generated").length,failures:report.filter(item=>item.status==="failed").length,
    originalBytes,generatedCardBytes:cardBytes,generatedDetailBytes:detailBytes,
    estimatedCardSavingsBytes:Math.max(0,cardSources-cardBytes),outputPaths:generated.map(item=>item.path)};
}

async function finishReport({mode,considered,report,outputDir}){
  const summary=summarizeReport({mode,considered,report}),result={...summary,report};
  if(outputDir){
    const registry={};
    for(const item of report)for(const output of item.outputs||[])if(["generated","existing"].includes(output.status))(registry[item.path]||=[]).push(output.variant);
    await writeFile(join(outputDir,"variant-registry.json"),`${JSON.stringify(registry,null,2)}\n`);
    await writeFile(join(outputDir,"variant-report.json"),`${JSON.stringify(result,null,2)}\n`);
  }
  console.log(JSON.stringify(result,null,2));
}

async function productionMode(options){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Production inspection requires Supabase URL and secret key environment variables");
  const manifestPaths=await readSelectionManifest(options.manifest),explicit=[...options.paths,...manifestPaths],hasSelector=Boolean(options.limit||explicit.length||options.productIds.length);
  assertProductionSafety(options,hasSelector);
  if(options.inspect&&!options.outputDir)throw new Error("--inspect requires --output-dir");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  let query=client.from("products").select("id,images,variations");if(options.productIds.length)query=query.in("id",options.productIds);
  const [{data:products,error:productError},{data:packs,error:packError}]=await Promise.all([query,client.from("student_packs").select("id,image_url,gallery")]);
  if(productError||packError)throw productError||packError;
  const referenced=new Map(),add=(url,owner)=>{const path=objectPath(url);if(path&&!/\.dn-(card|detail)\.webp$/.test(path)){const item=referenced.get(path)||{path,owners:[]};item.owners.push(owner);referenced.set(path,item)}};
  for(const product of products||[]){for(const url of product.images||[])add(url,{type:"product",id:product.id});for(const variation of product.variations||[])if(variation.image_url)add(variation.image_url,{type:"variation",productId:product.id,variationId:variation.id})}
  if(!options.productIds.length)for(const pack of packs||[]){if(pack.image_url)add(pack.image_url,{type:"pack",id:pack.id});for(const url of pack.gallery||[])add(url,{type:"pack-gallery",id:pack.id})}
  let selected=[...referenced.values()].sort((a,b)=>a.path.localeCompare(b.path));
  if(explicit.length){const wanted=new Set(explicit);selected=selected.filter(item=>wanted.has(item.path));const unknown=explicit.filter(path=>!referenced.has(path));if(unknown.length)throw new Error(`Selection contains ${unknown.length} unreferenced path(s): ${unknown.join(", ")}`)}
  if(options.limit)selected=selected.slice(0,options.limit);
  assertSelectedProductionBatch(options,selected.length);
  if(!options.apply&&!options.inspect){console.log(JSON.stringify({mode:"dry-run",sourceObjectsConsidered:selected.length,variantsPlanned:selected.length*2,selectionRequiredForApply:true,maxProductionBatch:MAX_PRODUCTION_BATCH,naming:"<original-path>.dn-{card|detail}.webp",cacheControl:CACHE_CONTROL,paths:selected},null,2));return}
  const report=[],mode=options.apply?"apply":"inspect",outputDir=options.outputDir?resolve(options.outputDir):null;
  if(outputDir)await mkdir(outputDir,{recursive:true});
  for(const item of selected){
    const targets=Object.keys(VARIANTS).map(variant=>variantPath(item.path,variant)),existing=new Set();
    for(const target of targets){const directory=target.slice(0,target.lastIndexOf("/")),result=await client.storage.from(BUCKET).list(directory,{search:basename(target),limit:1});if(result.error)throw result.error;if(result.data?.some(entry=>entry.name===basename(target)))existing.add(target)}
    const {data,error}=await client.storage.from(BUCKET).download(item.path);
    if(error){report.push({...item,status:"failed",sourceBytes:0,error:error.message,outputs:[]});continue}
    report.push({...item,...await processBuffer({path:item.path,input:Buffer.from(await data.arrayBuffer()),mode,outputDir,client,existing})});
  }
  await finishReport({mode,considered:selected.length,report,outputDir});
}

async function main(){
  const options=parseArgs(process.argv.slice(2));
  if(options.inputDir||(!options.inspect&&options.outputDir)){if(!options.inputDir||!options.outputDir)throw new Error("Local directory mode requires --input-dir and --output-dir");await localDirectoryMode(resolve(options.inputDir),resolve(options.outputDir));return}
  await productionMode(options);
}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{console.error(error.message);process.exitCode=1});
