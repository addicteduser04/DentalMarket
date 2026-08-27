#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "..");
const PRODUCT_FILE = resolve(ROOT, "data/dentanova_products.csv");
const VARIATION_FILE = resolve(ROOT, "data/dentanova_product_variations.csv");
const SOURCE = "dentalmarket-ma-2026";
const FALLBACK_IMAGE = "/branding/dentanova-logo.jpeg";

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  const [headers, ...records] = rows;
  return records.filter(values => values.some(Boolean)).map(values =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

const clean = value => String(value ?? "").trim();
const number = (value, fallback = 0) => {
  const parsed = Number(clean(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const boolean = value => clean(value).toLowerCase() === "true";
const slugify = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "non-classe";
const plainText = value => clean(value)
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
  .replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/\n{3,}/g, "\n\n").trim();

function json(value, fallback) {
  try { return JSON.parse(clean(value)); } catch { return fallback; }
}

function chooseCategory(value) {
  const categories = clean(value).split("|").map(clean).filter(Boolean);
  const useful = categories.filter(name => name.toLowerCase() !== "uncategorized");
  const name = useful[0] || categories[0] || "Non classé";
  return { name, slug: slugify(name), all: categories };
}

function technicalSpecs(value) {
  const entries = json(value, []);
  const result = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    const key = clean(entry?.name), val = clean(entry?.value);
    if (!key || !val) continue;
    result[key] = result[key] ? `${result[key]} · ${val}` : val;
  }
  return result;
}

function assertSource(products, variations) {
  if (products.length !== 196) throw new Error(`Expected 196 products, received ${products.length}`);
  if (variations.length !== 607) throw new Error(`Expected 607 variations, received ${variations.length}`);
  const productIds = new Set(products.map(row => clean(row.source_product_id)));
  const missingParents = variations.filter(row => !productIds.has(clean(row.parent_source_product_id)));
  if (missingParents.length) throw new Error(`${missingParents.length} variations have no source parent`);
  for (const [label, values] of [
    ["product source IDs", products.map(row => clean(row.source_product_id))],
    ["product slugs", products.map(row => clean(row.slug))],
    ["variation source IDs", variations.map(row => clean(row.source_variation_id))],
  ]) {
    if (values.some(value => !value) || new Set(values).size !== values.length)
      throw new Error(`${label} are blank or duplicated`);
  }
  const skus = products.map(row => clean(row.sku).toLowerCase()).filter(Boolean);
  if (new Set(skus).size !== skus.length) throw new Error("Product SKUs are duplicated");
}

function mapVariation(row) {
  const attributes = json(row.attributes_json, {});
  const label = Object.entries(attributes).map(([key, value]) =>
    `${key.replace(/^attribute_pa_/, "").replace(/^attribute_/, "").replaceAll("-", " ")}: ${value}`
  ).join(" · ") || clean(row.attributes_text) || `Variation ${clean(row.source_variation_id)}`;
  const regular = number(row.regular_price, number(row.price));
  const sale = clean(row.sale_price) ? number(row.sale_price) : null;
  const price = sale ?? number(row.price, regular);
  return {
    id: `source-${clean(row.source_variation_id)}`,
    source_id: clean(row.source_variation_id),
    label, sku: clean(row.variation_sku) || undefined, attributes,
    price, regular_price: regular, sale_price: sale,
    stock_quantity: clean(row.stock_quantity) ? number(row.stock_quantity) : undefined,
    availability: boolean(row.in_stock) ? "in_stock" : "out_of_stock",
    is_active: boolean(row.active) && boolean(row.visible),
    image_url: clean(row.image_url) || undefined,
    description: plainText(row.description), min_quantity: number(row.min_quantity, 1),
  };
}

export async function buildPayload() {
  const [productBytes, variationBytes] = await Promise.all([readFile(PRODUCT_FILE), readFile(VARIATION_FILE)]);
  const products = parseCsv(productBytes.toString("utf8").replace(/^\uFEFF/, ""));
  const variations = parseCsv(variationBytes.toString("utf8").replace(/^\uFEFF/, ""));
  assertSource(products, variations);
  const byParent = new Map();
  for (const row of variations) {
    const key = clean(row.parent_source_product_id);
    byParent.set(key, [...(byParent.get(key) || []), row]);
  }
  const mapped = products.map(row => {
    const productVariations = (byParent.get(clean(row.source_product_id)) || []).map(mapVariation);
    const category = chooseCategory(row.categories);
    const regular = number(row.regular_price, number(row.price_min, number(row.price)));
    const sale = clean(row.sale_price) ? number(row.sale_price) : null;
    const price = regular || number(row.price) || number(row.price_min);
    const imageUrls = clean(row.image_urls).split("|").map(clean).filter(Boolean);
    if (clean(row.featured_image_url) && !imageUrls.includes(clean(row.featured_image_url)))
      imageUrls.unshift(clean(row.featured_image_url));
    const available = clean(row.availability).toLowerCase() !== "outofstock";
    const stockQuantity = clean(row.stock_quantity)
      ? number(row.stock_quantity)
      : number(row.variation_stock_total);
    const publication = category.name && price >= 0 ? "published" : "draft";
    return {
      import_key: clean(row.sku) ? `sku:${clean(row.sku).toLowerCase()}` : `source:${clean(row.source_product_id)}`,
      sku: clean(row.sku), slug: slugify(row.slug), name: clean(row.name),
      product_type: clean(row.product_type), brand: clean(row.brand),
      short_summary: plainText(row.short_description), description: plainText(row.description),
      category_name: category.name, category_slug: category.slug,
      price, compare_at_price: sale !== null && regular > sale ? regular : null,
      promotional_price: sale !== null && sale < regular ? sale : null,
      images: imageUrls.length ? imageUrls : [FALLBACK_IMAGE],
      image_metadata: (imageUrls.length ? imageUrls : [FALLBACK_IMAGE]).map((url, index) => ({
        url, alt: clean(row.name), is_main: index === 0,
      })),
      og_image_url: imageUrls[0] || FALLBACK_IMAGE,
      technical_specs: technicalSpecs(row.additional_information_json),
      variations: productVariations, stock_tracking: clean(row.stock_quantity) !== "" || productVariations.length > 0,
      stock_quantity: stockQuantity, stock_status: available ? "in_stock" : "out_of_stock",
      availability_status: available ? (stockQuantity > 0 && stockQuantity <= 3 ? "low_stock" : "in_stock") : "out_of_stock",
      is_active: publication === "published", publication_status: publication,
      meta_description: plainText(row.short_description).slice(0, 160),
      source_metadata: {
        source_url: clean(row.source_url), source_product_id: clean(row.source_product_id),
        seller: clean(row.seller), categories: category.all,
        tags: clean(row.tags).split("|").map(clean).filter(Boolean),
        currency: clean(row.currency), stock_text: clean(row.stock_text),
        source_extracted_at: clean(row.source_extracted_at),
      },
    };
  });
  return {
    import_source: SOURCE,
    source_digest: createHash("sha256").update(productBytes).update(variationBytes).digest("hex"),
    source_product_count: products.length, source_variation_count: variations.length,
    products: mapped,
  };
}

async function importImages(client, payload) {
  const cache = new Map();
  async function persist(url) {
    if (!url.startsWith("https://")) return url;
    if (cache.has(url)) return cache.get(url);
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const type = (response.headers.get("content-type") || "").split(";")[0];
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!response.ok || !["image/jpeg","image/png","image/webp"].includes(type) || bytes.length > 5 * 1024 * 1024)
      throw new Error(`Invalid catalogue image: ${url}`);
    const extension = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[type];
    const path = `catalogue/${createHash("sha256").update(url).digest("hex").slice(0, 24)}.${extension}`;
    const upload = await client.storage.from("product-images").upload(path, bytes, { contentType: type, upsert: false });
    if (upload.error && !/already exists/i.test(upload.error.message)) throw upload.error;
    const publicUrl = client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    cache.set(url, publicUrl);
    return publicUrl;
  }
  for (const product of payload.products) {
    const imported = [];
    for (const url of product.images) imported.push(await persist(url));
    product.images = imported;
    product.image_metadata = imported.map((url, index) => ({url, alt: product.name, is_main:index === 0}));
    product.og_image_url = imported[0] || FALLBACK_IMAGE;
    for (const variation of product.variations) {
      if (variation.image_url) variation.image_url = await persist(variation.image_url);
    }
  }
}

async function main() {
  const payload = await buildPayload();
  const summary = {
    digest: payload.source_digest, products: payload.source_product_count,
    variations: payload.source_variation_count,
    categories: new Set(payload.products.map(product => product.category_slug)).size,
    brands: new Set(payload.products.map(product => product.brand).filter(Boolean)).size,
    products_without_source_image: payload.products.filter(product => product.images[0] === FALLBACK_IMAGE).length,
  };
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode:"dry-run", ...summary }, null, 2));
    return;
  }
  if (!process.argv.includes("--confirm-production"))
    throw new Error("Apply requires --confirm-production");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be available in the process environment");
  const client = createClient(url, key, { auth:{persistSession:false,autoRefreshToken:false} });
  await importImages(client, payload);
  const { data, error } = await client.rpc("import_dentanova_catalogue", { payload });
  if (error) throw new Error("Catalogue import RPC failed; inspect secure server logs");
  console.log(JSON.stringify({ mode:"applied", ...summary, result:data }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
