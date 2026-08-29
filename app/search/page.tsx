import {Search} from "lucide-react";
import Link from "next/link";
import {ProductCard} from "@/components/storefront/product-card";
import {getCatalogListing} from "@/lib/data";
import {EmptyState} from "@/components/ui/empty-state";
import {getLocale} from "@/lib/i18n-server";

const PAGE_SIZE=24;
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
  const filters=await searchParams,query=(filters.q||"").trim().toLowerCase();
  const {products,categories,offers}=await getCatalogListing(),locale=await getLocale();
  const foundCategories=query?categories.filter(category=>category.name.toLowerCase().includes(query)):[];
  const found=query?products.filter(product=>product.name.toLowerCase().includes(query)||product.short_summary?.toLowerCase().includes(query)||product.categories?.name.toLowerCase().includes(query)):products;
  const requestedPage=Math.max(1,Number.parseInt(filters.page||"1",10)||1),pageCount=Math.max(1,Math.ceil(found.length/PAGE_SIZE)),page=Math.min(requestedPage,pageCount),visible=found.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const pageHref=(target:number)=>`/search?q=${encodeURIComponent(filters.q||"")}&page=${target}`;
  return <div className="store-page"><div className="container-shell py-14"><p className="eyebrow">Catalogue complet</p><h1 className="display mt-3 text-5xl">Que recherchez-vous ?</h1>
    <form role="search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"><label htmlFor="catalogue-search" className="sr-only">Rechercher dans le catalogue</label><div className="relative min-w-0 flex-1"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/35"/><input id="catalogue-search" name="q" type="search" defaultValue={query} className="field !rounded-full !py-4 !pl-14" placeholder="Miroir, composite, pince…"/></div><button type="submit" className="button sm:min-w-32">Rechercher</button></form>
    {foundCategories.length>0&&<div className="mt-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Catégories correspondantes</p><div className="mt-3 flex flex-wrap gap-2">{foundCategories.map(category=><Link key={category.id} href={`/category/${category.slug}`} className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-sm font-bold transition hover:border-cyan-300/40 hover:text-cyan-300">{category.name}</Link>)}</div></div>}
    {!products.length?<div className="mt-10"><EmptyState title="Notre catalogue arrive bientôt" text="La sélection DENTANOVA est en cours de préparation."/></div>:<><p className="mt-8 text-sm text-white/50">{found.length} résultat{found.length!==1?"s":""}{query&&<> pour « {query} »</>}</p>{found.length?<><div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map(product=><ProductCard key={product.id} product={product} offers={offers} locale={locale}/>)}</div>{pageCount>1&&<nav aria-label="Pagination du catalogue" className="mt-10 flex items-center justify-center gap-3">{page>1&&<Link className="button" href={pageHref(page-1)}>Précédent</Link>}<span className="text-sm text-white/55">Page {page} / {pageCount}</span>{page<pageCount&&<Link className="button" href={pageHref(page+1)}>Suivant</Link>}</nav>}</>:<div className="card mt-6 px-6 py-12 text-center"><h2 className="display text-2xl">Aucun résultat</h2><p className="mt-3 text-sm text-white/50">Essayez un autre nom de produit ou explorez le catalogue complet.</p><Link href="/search" className="button mt-6">Voir tout le catalogue</Link></div>}</>}
  </div></div>;
}
