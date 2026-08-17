#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildPayload as buildCataloguePayload } from "./catalogue-import.mjs";

const API = "https://dentalmarket.ma/wp-json/wc/store/v1";
const IMPORT_SOURCE = "dentalmarket-ma-student-packs";
const STUDENT_CATEGORY_ID = 57;

const cityBySlug = {
  fmdc:"Casablanca", fmdr:"Rabat", usmba:"Fès", uef:"Fès", uiass:"Rabat",
  uic:"Casablanca", uir:"Rabat", "um6ss-casa":"Casablanca", "um6ss-rabat":"Rabat",
  upf:"Fès", upm:"Marrakech",
};
const acronymBySlug = {
  fmdc:"FMDC", fmdr:"FMDR", usmba:"FMPDF", uef:"UEMF", uiass:"UIASS",
  uic:"UIC", uir:"UIR", "um6ss-casa":"UM6SS CASA", "um6ss-rabat":"UM6SS RABAT",
  upf:"UPF", upm:"UPM",
};
const years = [
  {code:"year-1",label_fr:"Première année",label_ar:"السنة الأولى",display_order:1,is_active:true},
  {code:"year-2",label_fr:"Deuxième année",label_ar:"السنة الثانية",display_order:2,is_active:true},
  {code:"year-3",label_fr:"Troisième année",label_ar:"السنة الثالثة",display_order:3,is_active:true},
  {code:"year-4",label_fr:"Quatrième année",label_ar:"السنة الرابعة",display_order:4,is_active:true},
];

const decode = value => String(value || "")
  .replace(/&#8211;|&#8212;/g,"–").replace(/&amp;/g,"&").replace(/&rsquo;/g,"’")
  .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)));
const plainText = value => decode(value).replace(/<script[\s\S]*?<\/script>/gi,"")
  .replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<br\s*\/?>/gi,"\n")
  .replace(/<\/p>/gi,"\n").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const money = (minor, unit=2) => Number(minor) / 10 ** unit;
const normalizeName = value => plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slugify = value => plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

async function fetchJson(path) {
  const response = await fetch(`${API}${path}`, {
    headers:{"user-agent":"DENTANOVA student-pack importer"},
    signal:AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Source request failed (${response.status})`);
  return response.json();
}

async function sourceCategories() {
  const first = await fetchJson("/products/categories?per_page=100&page=1");
  const second = await fetchJson("/products/categories?per_page=100&page=2");
  return [...first,...second];
}

export function deriveAcademicYear(name) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const match = normalized.match(/\b([1-4])(?:re|er|e|eme)?\s+annee\b/);
  if (!match) throw new Error(`Academic year is not reliable for ${name}`);
  return `year-${match[1]}`;
}

export function deriveSession(name) {
  const range = name.match(/\b(20\d{2})\s*[-–]\s*(20\d{2})\b/);
  if (range) return `${range[1]}–${range[2]}`;
  const single = name.match(/\b20\d{2}\b/);
  return single?.[0] || "";
}

export async function buildStudentPackPayload() {
  const [categories, search, catalogue] = await Promise.all([
    sourceCategories(), fetchJson("/products?search=Pack&per_page=100"), buildCataloguePayload(),
  ]);
  const universities = categories.filter(category => category.parent === STUDENT_CATEGORY_ID)
    .map((category,index) => ({
      source_id:String(category.id), name:decode(category.name),
      acronym:acronymBySlug[category.slug] || category.slug.toUpperCase(),
      city:cityBySlug[category.slug] || "Non précisée", slug:category.slug,
      description:"", image_url:category.image?.src || "", display_order:index, is_active:true,
    }));
  const catalogueBySource = new Map(catalogue.products.map(product =>
    [String(product.source_metadata.source_product_id),product]));
  const productsByName = new Map();
  for (const product of catalogue.products) {
    const key=normalizeName(product.name);
    productsByName.set(key,[...(productsByName.get(key)||[]),product]);
  }
  const variationBySource = new Map(catalogue.products.flatMap(product =>
    product.variations.map(variation => [String(variation.source_id),{product,variation}])));
  const sourcePacks = search.filter(product =>
    product.type === "bundle" && product.categories?.some(category => category.id === STUDENT_CATEGORY_ID));
  const unmatched = [], ambiguous = [];
  const packs = [];
  let componentCount = 0, exactVariationCount = 0, sourceComponentCount = 0;

  for (const summary of sourcePacks) {
    const source = await fetchJson(`/products/${summary.id}`);
    const bundle = source.extensions?.bundles;
    if (!bundle?.bundled_items?.length) throw new Error(`Pack ${source.id} has no reliable bundle items`);
    sourceComponentCount += bundle.bundled_items.length;
    const universityCategory = source.categories.find(category =>
      universities.some(university => university.source_id === String(category.id)));
    if (!universityCategory) throw new Error(`Pack ${source.id} has no supported university`);
    const components = [];
    for (const item of bundle.bundled_items) {
      let product = catalogueBySource.get(String(item.product_id));
      let matchMethod = "source_id";
      if (!product) {
        const candidates=productsByName.get(normalizeName(item.title))||[];
        if(candidates.length===1){product=candidates[0];matchMethod="unique_normalized_name";}
      }
      if (!product) {
        unmatched.push({pack_source_id:String(source.id),source_bundle_item_id:String(item.bundled_item_id),
          source_product_id:String(item.product_id),title:plainText(item.title),reason:"source product is absent from the DENTANOVA catalogue"});
        continue;
      }
      let variationSourceId = "";
      if (item.allowed_variations?.length === 1) {
        const candidate = variationBySource.get(String(item.allowed_variations[0]));
        if (candidate?.product === product) {
          variationSourceId = String(item.allowed_variations[0]);
          exactVariationCount++;
        } else {
          ambiguous.push({pack_source_id:String(source.id),source_bundle_item_id:String(item.bundled_item_id),
            source_product_id:String(item.product_id),title:plainText(item.title),
            reason:"the source variation is absent or does not belong to the matched product"});
        }
      } else if (item.allowed_variations?.length > 1) {
        ambiguous.push({pack_source_id:String(source.id),source_bundle_item_id:String(item.bundled_item_id),
          source_product_id:String(item.product_id),title:plainText(item.title),
          allowed_variation_ids:item.allowed_variations.map(String),reason:"multiple source variations are allowed"});
      }
      const selected = variationSourceId ? variationBySource.get(variationSourceId)?.variation : null;
      const contribution = Number(selected?.price ?? product.promotional_price ?? product.price);
      components.push({
        source_bundle_item_id:String(item.bundled_item_id),
        source_product_id:String(product.source_metadata.source_product_id), variation_source_id:variationSourceId,
        quantity:Number(item.quantity_default), is_required:!item.optional && Number(item.quantity_min) > 0,
        display_order:Number(item.menu_order), notes:"",
        price_snapshot:Number.isFinite(contribution) ? contribution : null,
        source_metadata:{title:plainText(item.title),source_product_id:String(item.product_id),
          match_method:matchMethod,allowed_variation_ids:item.allowed_variations?.map(String)||[]},
      });
    }
    componentCount += components.length;
    const prices = bundle.bundle_price;
    const unit = prices.currency_minor_unit ?? 2;
    const manualPrice = money(prices.regular_price.min.incl_tax,unit);
    const promotionalPrice = money(prices.price.min.incl_tax,unit);
    packs.push({
      university_source_id:String(universityCategory.id),
      academic_year_code:deriveAcademicYear(source.name),
      source_product_id:String(source.id), source_id:String(source.id),
      import_key:`source:${source.id}`, name:plainText(source.name), slug:slugify(source.name)||`pack-${source.id}`,
      short_description:plainText(source.short_description), description:plainText(source.description),
      image_url:source.images?.[0]?.src || "", gallery:(source.images||[]).map(image=>image.src),
      pack_code:`PACK-${source.id}`, source_url:source.permalink, academic_session:deriveSession(source.name),
      manual_price:manualPrice, component_total:null,
      promotional_price:promotionalPrice < manualPrice ? promotionalPrice : null,
      publication_status:components.length===bundle.bundled_items.length&&source.is_in_stock ? "published" : "draft",
      is_featured:true, display_order:0, components,
      source_metadata:{bundle_stock_quantity:bundle.bundle_stock_quantity,currency:prices.currency_code,
        source_component_count:bundle.bundled_items.length,matched_component_count:components.length},
    });
  }
  const canonical = JSON.stringify({universities,years,packs});
  return {
    import_source:IMPORT_SOURCE, source_digest:createHash("sha256").update(canonical).digest("hex"),
    universities, academic_years:years, packs, component_count:componentCount,
    review:{unmatched,ambiguous,exact_variation_matches:exactVariationCount,
      source_components:sourceComponentCount},
  };
}

async function main() {
  const payload = await buildStudentPackPayload();
  const summary = {
    digest:payload.source_digest, universities:payload.universities.length,
    academic_years:payload.academic_years.length, packs:payload.packs.length,
    matched_components:payload.component_count,
    exact_variation_matches:payload.review.exact_variation_matches,
    ambiguous_components:payload.review.ambiguous.length,
    unmatched_components:payload.review.unmatched.length,
  };
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({mode:"dry-run",...summary,review:payload.review},null,2));
    return;
  }
  if (!process.argv.includes("--confirm-production")) throw new Error("Apply requires --confirm-production");
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url||!key) throw new Error("Supabase server environment is incomplete");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {review,...rpcPayload}=payload;
  const {data,error}=await client.rpc("import_dentanova_student_packs",{payload:rpcPayload});
  if (error) throw new Error("Student pack import RPC failed; inspect secure server logs");
  console.log(JSON.stringify({mode:"applied",...summary,result:data},null,2));
}

if (import.meta.url===`file://${process.argv[1]}`) main().catch(error=>{
  console.error(error.message); process.exitCode=1;
});
