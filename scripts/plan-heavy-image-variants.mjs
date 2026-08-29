#!/usr/bin/env node
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createClient} from "@supabase/supabase-js";
import {listObjects,storageObjectPath} from "./image-audit.mjs";

const DEFAULT_MIN_BYTES=150_000,DEFAULT_BATCH_SIZE=40,MAX_BATCH_SIZE=50;
const REGISTRY_PATH=resolve(import.meta.dirname,"../data/product-image-variants.json");

function bytes(value){return Number(value?.metadata?.size||0)}
function parsePositiveInteger(value,label,fallback){
  if(value==null)return fallback;
  const parsed=Number.parseInt(value,10);
  if(!Number.isInteger(parsed)||parsed<1)throw new Error(`${label} must be a positive integer`);
  return parsed;
}
export function parseArgs(argv){
  const value=name=>{const index=argv.indexOf(name);return index<0?null:argv[index+1]};
  const batchSize=parsePositiveInteger(value("--batch-size"),"--batch-size",DEFAULT_BATCH_SIZE);
  if(batchSize>MAX_BATCH_SIZE)throw new Error(`--batch-size cannot exceed ${MAX_BATCH_SIZE}`);
  return {outputDir:value("--output-dir"),minBytes:parsePositiveInteger(value("--min-bytes"),"--min-bytes",DEFAULT_MIN_BYTES),batchSize,limit:parsePositiveInteger(value("--limit"),"--limit",null)};
}

function requestedVariants(usages){
  const result=new Set();
  for(const usage of usages){
    if(["product-main","pack-main"].includes(usage)){result.add("card");result.add("detail")}
    if(usage==="variation")result.add("card");
  }
  return [...result];
}

export function buildHeavyPlan({references,objects,registry,minBytes=DEFAULT_MIN_BYTES,limit=null,batchSize=DEFAULT_BATCH_SIZE}){
  const byPath=new Map(objects.map(object=>[object.path,object])),byReference=new Map();
  for(const reference of references){
    const path=storageObjectPath(reference.url);
    if(!path||/\.dn-(card|detail)\.webp$/.test(path))continue;
    const current=byReference.get(path)||{path,references:[],usages:new Set()};
    current.references.push(reference);current.usages.add(reference.usage);byReference.set(path,current);
  }
  let candidates=[];
  for(const item of byReference.values()){
    const object=byPath.get(item.path),sourceBytes=bytes(object);
    if(!object||sourceBytes<minBytes)continue;
    const wanted=requestedVariants(item.usages),available=new Set(registry[item.path]||[]),missingVariants=wanted.filter(variant=>!available.has(variant));
    if(!missingVariants.length)continue;
    candidates.push({path:item.path,sourceBytes,referenceCount:item.references.length,usages:[...item.usages].sort(),missingVariants,owners:item.references.map(reference=>reference.owner).filter(Boolean)});
  }
  candidates.sort((a,b)=>b.sourceBytes-a.sourceBytes||b.referenceCount-a.referenceCount||a.path.localeCompare(b.path));
  if(limit)candidates=candidates.slice(0,limit);
  const batches=[];
  for(let index=0;index<candidates.length;index+=batchSize)batches.push(candidates.slice(index,index+batchSize));
  return {minBytes,batchSize,candidateCount:candidates.length,totalCandidateBytes:candidates.reduce((sum,item)=>sum+item.sourceBytes,0),candidates,batches};
}

async function collectProductionReferences(client){
  const [{data:products,error:productError},{data:packs,error:packError}]=await Promise.all([
    client.from("products").select("id,name,images,variations,is_active,publication_status,catalog_visible").eq("is_active",true).eq("publication_status","published"),
    client.from("student_packs").select("id,name,image_url,gallery,publication_status").eq("publication_status","published"),
  ]);
  if(productError||packError)throw productError||packError;
  const references=[];
  for(const product of products||[]){
    const images=product.images||[];
    if(images[0])references.push({url:images[0],usage:"product-main",owner:{type:"product",id:product.id,name:product.name,catalogVisible:product.catalog_visible!==false}});
    for(const variation of product.variations||[])if(variation.image_url)references.push({url:variation.image_url,usage:"variation",owner:{type:"variation",productId:product.id,name:product.name}});
  }
  for(const pack of packs||[])if(pack.image_url)references.push({url:pack.image_url,usage:"pack-main",owner:{type:"pack",id:pack.id,name:pack.name}});
  return references;
}

async function main(){
  const options=parseArgs(process.argv.slice(2));
  if(!options.outputDir)throw new Error("--output-dir is required");
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Heavy-image planning requires Supabase URL and a server-side secret key");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),registry=JSON.parse(await readFile(REGISTRY_PATH,"utf8"));
  const [references,objects]=await Promise.all([collectProductionReferences(client),listObjects(client)]),plan=buildHeavyPlan({references,objects,registry,minBytes:options.minBytes,limit:options.limit,batchSize:options.batchSize});
  const outputDir=resolve(options.outputDir);await mkdir(outputDir,{recursive:true});
  for(let index=0;index<plan.batches.length;index++){
    const batch=plan.batches[index],number=String(index+1).padStart(2,"0");
    await writeFile(resolve(outputDir,`heavy-batch-${number}.json`),`${JSON.stringify({paths:batch.map(item=>item.path),items:batch},null,2)}\n`);
  }
  const report={mode:"metadata-only-heavy-plan",generatedAt:new Date().toISOString(),...plan,batches:plan.batches.map((batch,index)=>({number:index+1,objects:batch.length,bytes:batch.reduce((sum,item)=>sum+item.sourceBytes,0),manifest:`heavy-batch-${String(index+1).padStart(2,"0")}.json`}))};
  await writeFile(resolve(outputDir,"heavy-plan-report.json"),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(report,null,2));
}

if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{console.error(error.message);process.exitCode=1});
