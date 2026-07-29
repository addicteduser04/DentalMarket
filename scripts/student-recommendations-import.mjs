import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";

export const SOURCE_ROOT="https://dentalmarket.ma/product-category/student-supplies/";
export const IMPORT_SOURCE="dentalmarket-student-recommendations-v1";
const universityAliases={fmdc:"fmdc",fmdr:"fmdr",usmba:"usmba",uir:"uir",uiass:"uiass",upf:"upf",uef:"uef","um6ss-casa":"um6ss-casa",upm:"upm",uic:"uic"};

export function uniqueLinks(html,pattern){return [...new Set([...html.matchAll(pattern)].map(match=>match[1]))]}

export function parseSourcePage(url,html){
  const parts=new URL(url).pathname.split("/").filter(Boolean);
  const sourceUniversity=parts.at(-2),sourceYear=parts.at(-1);
  const year=Number(sourceYear?.match(/_a([1-4])$/)?.[1]),universitySlug=universityAliases[sourceUniversity];
  if(!universitySlug||!year)throw new Error(`Unsupported source category: ${url}`);
  const products=uniqueLinks(html,/href=["'`](https:\/\/dentalmarket\.ma\/product\/[^"'`?#]+\/)["'`]/g);
  return {url,universitySlug,academicYearCode:`year-${year}`,products};
}

export async function discoverSourcePages(fetcher=fetch){
  const response=await fetcher(SOURCE_ROOT);
  if(!response.ok)throw new Error(`Source hierarchy request failed (${response.status})`);
  const html=await response.text();
  return uniqueLinks(html,/href=["'`](https:\/\/dentalmarket\.ma\/product-category\/student-supplies\/[^"'`?#]+\/)["'`]/g)
    .filter(url=>url.split("/").filter(Boolean).length>=6).sort();
}

export async function extractRecommendations(fetcher=fetch){
  const urls=await discoverSourcePages(fetcher);
  if(urls.length!==40)throw new Error(`Expected 40 university/year pages, received ${urls.length}`);
  const pages=[];
  for(let index=0;index<urls.length;index+=5){
    const batch=await Promise.all(urls.slice(index,index+5).map(async url=>{
      const response=await fetcher(url);
      if(!response.ok)throw new Error(`Source category request failed (${response.status})`);
      return parseSourcePage(url,await response.text());
    }));
    pages.push(...batch);
  }
  if(pages.some(page=>page.products.length===0))throw new Error("A source category unexpectedly contains no products");
  return pages;
}

export function buildPayload(pages,catalogue){
  const bySourceUrl=new Map(catalogue.map(product=>[product.source_metadata?.source_url,product]));
  const recommendations=[],unmatched=[],excludedPacks=[];
  for(const page of pages)page.products.forEach((sourceProductUrl,displayOrder)=>{
    const product=bySourceUrl.get(sourceProductUrl);
    if(!product){unmatched.push({sourceUrl:page.url,sourceProductUrl});return}
    const sourceSlug=new URL(sourceProductUrl).pathname.split("/").filter(Boolean).at(-1);
    if(product.product_type==="bundle"||/^pack[-/ ]/i.test(sourceSlug)){excludedPacks.push(sourceProductUrl);return}
    recommendations.push({
      university_slug:page.universitySlug,academic_year_code:page.academicYearCode,
      source_url:page.url,source_product_url:sourceProductUrl,
      import_key:`${page.universitySlug}:${page.academicYearCode}:${product.id}`,
      display_order:displayOrder,variation_id:null,
      source_metadata:{source_category_url:page.url,source_product_id:product.source_metadata?.source_product_id},
    });
  });
  const digest=createHash("sha256").update(JSON.stringify(recommendations)).digest("hex");
  return {payload:{import_source:IMPORT_SOURCE,source_digest:digest,page_count:pages.length,recommendations},review:{unmatched,excludedPacks:[...new Set(excludedPacks)]}};
}

async function main(){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Required Supabase environment is unavailable");
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data:catalogue,error}=await db.from("products").select("id,name,product_type,source_metadata");
  if(error)throw new Error("Catalogue verification failed");
  const pages=await extractRecommendations(),{payload,review}=buildPayload(pages,catalogue);
  const summary={mode:process.argv.includes("--apply")?"apply":"dry-run",pages:pages.length,populatedPages:pages.filter(page=>page.products.length>0).length,relationships:payload.recommendations.length,uniqueProducts:new Set(payload.recommendations.map(item=>item.import_key.split(":").at(-1))).size,unmatched:review.unmatched.length,excludedFixedPacks:review.excludedPacks.length,sourceDigest:payload.source_digest};
  if(!process.argv.includes("--apply")){console.log(JSON.stringify({...summary,review},null,2));return}
  if(!process.argv.includes("--confirm-production"))throw new Error("Apply requires --confirm-production");
  if(review.unmatched.length)throw new Error("Apply blocked by unmatched source products");
  const {data,error:importError}=await db.rpc("import_student_recommendations",{payload});
  if(importError)throw new Error("Recommendation import failed");
  console.log(JSON.stringify({...summary,result:data},null,2));
}

if(import.meta.url===`file://${process.argv[1]}`)main().catch(error=>{
  console.error(error instanceof Error?error.message:"Recommendation import failed");
  process.exitCode=1;
});
