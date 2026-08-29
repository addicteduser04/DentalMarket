#!/usr/bin/env node
import {readFile,writeFile} from "node:fs/promises";
import {basename,resolve} from "node:path";
import {createClient} from "@supabase/supabase-js";

const BUCKET="product-images",CACHE_CONTROL=31536000,REGISTRY_PATH=resolve(import.meta.dirname,"../data/product-image-variants.json");
const variantPath=(path,variant)=>`${path}.dn-${variant}.webp`;

export function mergeVariantRegistry(current,candidate){
  const merged={...current};
  for(const [path,variants] of Object.entries(candidate))merged[path]=[...new Set([...(merged[path]||[]),...variants])].sort();
  return Object.fromEntries(Object.entries(merged).sort(([a],[b])=>a.localeCompare(b)));
}

function parseArgs(argv){
  const value=name=>{const index=argv.indexOf(name);return index<0?null:argv[index+1]};
  return {candidateRegistry:value("--candidate-registry"),updateRegistry:argv.includes("--update-registry")};
}
function metadataValue(metadata,...keys){for(const key of keys)if(metadata?.[key]!=null)return metadata[key];return null}
function cacheControlSeconds(value){const direct=Number(value);if(Number.isFinite(direct))return direct;const match=String(value||"").match(/max-age=(\d+)/i);return match?Number(match[1]):0}
async function findObject(client,path){
  const slash=path.lastIndexOf("/"),directory=slash>=0?path.slice(0,slash):"",name=basename(path),{data,error}=await client.storage.from(BUCKET).list(directory,{search:name,limit:10});
  if(error)throw error;return (data||[]).find(entry=>entry.name===name)||null;
}

async function main(){
  const options=parseArgs(process.argv.slice(2));if(!options.candidateRegistry)throw new Error("--candidate-registry is required");
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Variant verification requires Supabase URL and a server-side secret key");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),candidate=JSON.parse(await readFile(resolve(options.candidateRegistry),"utf8")),verified={},failures=[];
  for(const [source,variants] of Object.entries(candidate))for(const variant of variants){
    const target=variantPath(source,variant),object=await findObject(client,target),metadata=object?.metadata||{},size=Number(metadataValue(metadata,"size")||0),contentType=String(metadataValue(metadata,"mimetype","contentType","content_type")||"").toLowerCase(),cacheControl=cacheControlSeconds(metadataValue(metadata,"cacheControl","cache_control"));
    if(!object||size<=0||contentType!=="image/webp"||cacheControl<CACHE_CONTROL){failures.push({source,variant,target,exists:Boolean(object),size,contentType,cacheControl});continue}
    (verified[source]||=[]).push(variant);
  }
  const report={verifiedSources:Object.keys(verified).length,verifiedVariants:Object.values(verified).flat().length,failures};
  if(failures.length){console.log(JSON.stringify(report,null,2));throw new Error(`${failures.length} variant(s) failed metadata verification`)}
  if(options.updateRegistry){const current=JSON.parse(await readFile(REGISTRY_PATH,"utf8")),merged=mergeVariantRegistry(current,verified);await writeFile(REGISTRY_PATH,`${JSON.stringify(merged,null,2)}\n`);report.registryUpdated=true}
  console.log(JSON.stringify(report,null,2));
}

if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{console.error(error.message);process.exitCode=1});
