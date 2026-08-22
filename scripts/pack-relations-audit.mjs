#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){console.error("Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");process.exit(2)}
const db = createClient(url,key,{auth:{persistSession:false}});

async function run(){
  console.log("Fetching student_packs and student_pack_components...");
  const [{data:packRows, error:packErr}] = [await db.from('student_packs').select('id,slug,university_id,academic_year_id,publication_status,name,pack_code,source_id').eq('publication_status','published')];
  if(packErr){console.error('Query error (student_packs)',packErr);process.exit(2)}
  const publicPackIds=(packRows||[]).map(pack=>pack.id);
  const [{data:componentRows, error:compErr}] = [publicPackIds.length
    ? await db.from('student_pack_components').select('id,pack_id,product_id,variation_id,quantity,is_required,price_snapshot,display_order,notes').in('pack_id',publicPackIds)
    : {data:[],error:null}];
  if(compErr){console.error('Query error (student_pack_components)',compErr);process.exit(2)}
  const rows = componentRows || [];
  const packs = packRows || [];
  console.log(`Loaded ${packs.length} packs and ${rows.length} components`);
  // PACK DUPLICATE ANALYSIS
  const packCount = packs.length;
  const packIds = packs.map(p=>p.id);
  const uniquePackIds = new Set(packIds).size;
  const slugMap = {};
  const uniSlugMap = {};
  const uniYearSlugMap = {};
  const published = packs.filter(p=>p.publication_status==='published');
  for(const p of packs){
    slugMap[p.slug] = slugMap[p.slug]||[]; slugMap[p.slug].push(p.id);
    const uniKey = `${p.university_id||''}::${p.slug||''}`;
    uniSlugMap[uniKey]=uniSlugMap[uniKey]||[]; uniSlugMap[uniKey].push(p.id);
    const uniYearKey = `${p.university_id||''}::${p.academic_year_id||''}::${p.slug||''}`;
    uniYearSlugMap[uniYearKey]=uniYearSlugMap[uniYearKey]||[]; uniYearSlugMap[uniYearKey].push(p.id);
  }
  const duplicateSlugs = Object.entries(slugMap).filter(([,ids])=>ids.length>1);
  const duplicateUniSlugs = Object.entries(uniSlugMap).filter(([,ids])=>ids.length>1);
  const duplicateUniYearSlugs = Object.entries(uniYearSlugMap).filter(([,ids])=>ids.length>1);
  console.log('\nPack duplicates summary:');
  console.log(`- total pack rows: ${packCount}`);
  console.log(`- unique pack IDs: ${uniquePackIds}`);
  console.log(`- duplicate slugs (count): ${duplicateSlugs.length}`);
  console.log(`- duplicate university_id+slug combinations: ${duplicateUniSlugs.length}`);
  console.log(`- duplicate university+year+slug combinations: ${duplicateUniYearSlugs.length}`);
  console.log(`- published packs: ${published.length}`);
  // show examples
  if(duplicateUniYearSlugs.length) console.log('Example duplicated uni+year+slug:', duplicateUniYearSlugs.slice(0,5));
  let total = rows.length, validProduct=0, trueMissingProduct=0, unresolvedDueToVisibility=0, missingVariation=0, genuineRupture=0, falseRupture=0, falseZero=0, noName=0;
  const brokenRows = [];
  // Fetch products for unique product_ids
  const productIds = Array.from(new Set(rows.map(r=>r.product_id).filter(Boolean)));
  const products = {};
  if(productIds.length){
    // fetch in batches of 500
    for(let i=0;i<productIds.length;i+=500){
      const batch = productIds.slice(i,i+500);
      const {data:pd, error:perr} = await db.from('products').select('id,slug,name,price,promotional_price,stock_status,availability_status,variations,images,price_mode,is_active,publication_status,catalog_visible').in('id',batch);
      if(perr){console.error('Query error (products)',perr);process.exit(2)}
      (pd||[]).forEach(p=>{products[p.id]=p});
    }
  }

  for(const r of rows){
    const relId = r.id;
    const pack = packs.find(p=>p.id===r.pack_id) || null;
    const packId = r.pack_id; const packSlug = pack?.slug||null; const packName = pack?.name||null;
    const productId = r.product_id; const variationId = r.variation_id||null;
    const product = productId?products[productId]||null:null;
    const productExists = !!product && !!product.id;
    if(!productExists) trueMissingProduct++; else validProduct++;
    if(productExists && (!product.is_active || product.publication_status!=='published')) unresolvedDueToVisibility++;
    let variationExists = false; let variation = null;
    if(productExists && variationId){
      const vars = Array.isArray(product.variations)?product.variations:[];
      variation = vars.find(v=>v.id===variationId||v.source_id===variationId) || null;
      variationExists = !!variation;
      if(!variationExists) missingVariation++;
    }
    const stock_status = productExists ? (product.availability_status||product.stock_status||null) : null;
    if(productExists && stock_status && stock_status!=='in_stock') genuineRupture++;
    if(!productExists || (variationId && !variationExists && productExists)) falseRupture++;
    const currentPrice = productExists ? (variation?.price ?? product.promotional_price ?? product.price ?? null) : null;
    if(currentPrice===0) falseZero++;
    if(!productExists || !product.name) noName++;
    if((!productExists) || (variationId && !variationExists)){
      brokenRows.push({relation_id:relId,pack_id:packId,pack_slug:packSlug,pack_name:packName,product_id:productId,variation_id:variationId,product_exists:productExists,variation_exists:variationExists,stock_status,current_price:currentPrice});
    }
  }
  console.log('\nAudit summary:');
  console.log(`- total relations: ${total}`);
  console.log(`- relations with valid product: ${validProduct}`);
  console.log(`- true missing product references: ${trueMissingProduct}`);
  console.log(`- existing products unresolved due to inactive/draft state: ${unresolvedDueToVisibility}`);
  console.log(`- valid product but missing referenced variation: ${missingVariation}`);
  console.log(`- valid product with stock_status != in_stock (genuine rupture): ${genuineRupture}`);
  console.log(`- rows that would currently render as false 'Rupture' (missing product or missing variation): ${falseRupture}`);
  console.log(`- rows that would currently render 0 MAD: ${falseZero}`);
  console.log(`- rows that would render without a name: ${noName}`);
  console.log(`\nBroken rows (showing first 200):`);
  for(const b of brokenRows.slice(0,200)){
    console.log(JSON.stringify(b));
  }
  // COMPONENT DUPLICATE ANALYSIS
  const compCount = rows.length;
  const compIds = rows.map(r=>r.id);
  const uniqueCompIds = new Set(compIds).size;
  const packProductMap = {};
  const packProductVarMap = {};
  const sameProductDiffVar = [];
  for(const c of rows){
    const key = `${c.pack_id}::${c.product_id}`;
    packProductMap[key]=packProductMap[key]||[]; packProductMap[key].push(c.id);
    const varKey = `${c.pack_id}::${c.product_id}::${c.variation_id||''}`;
    packProductVarMap[varKey]=packProductVarMap[varKey]||[]; packProductVarMap[varKey].push(c.id);
  }
  const dupPackProduct = Object.entries(packProductMap).filter(([,ids])=>ids.length>1);
  const dupPackProductVar = Object.entries(packProductVarMap).filter(([,ids])=>ids.length>1);
  // detect same product with different variations inside same pack
  for(const [k,ids] of Object.entries(packProductMap)){
    const [packId,productId] = k.split('::');
    const variants = Object.keys(packProductVarMap).filter(v=>v.startsWith(`${packId}::${productId}::`));
    if(variants.length>1) sameProductDiffVar.push({packId,productId,variants});
  }
  console.log('\nComponent duplicates summary:');
  console.log(`- total component relations: ${compCount}`);
  console.log(`- unique relation IDs: ${uniqueCompIds}`);
  console.log(`- duplicate pack_id+product_id combinations: ${dupPackProduct.length}`);
  console.log(`- duplicate pack_id+product_id+variation_id combinations: ${dupPackProductVar.length}`);
  console.log(`- same product with different variations (count): ${sameProductDiffVar.length}`);
  if(dupPackProduct.length) console.log('Example duplicate pack+product entries:', dupPackProduct.slice(0,10));
  if(dupPackProductVar.length) console.log('Example duplicate pack+product+variation entries:', dupPackProductVar.slice(0,10));
  if(dupPackProduct.length){
    console.log('\nDetailed duplicate pack+product rows (first 50):');
    for(const [key,ids] of dupPackProduct.slice(0,50)){
      const [packId,productId]=key.split('::');
      const details = rows.filter(r=>r.pack_id===packId && r.product_id===productId).map(r=>({id:r.id,variation_id:r.variation_id,quantity:r.quantity,price_snapshot:r.price_snapshot,source_bundle_item_id:r.source_bundle_item_id}));
      console.log(JSON.stringify({packId,productId,count:ids.length,details}));
    }
  }
  console.log('\nDone.');
}

run().catch(err=>{console.error(err);process.exit(2)});
