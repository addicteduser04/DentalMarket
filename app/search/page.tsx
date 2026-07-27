import { Search } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import { getCatalog } from "@/lib/data";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SearchPage({searchParams}:{searchParams:{q?:string}}) {
  const query=(searchParams.q||"").trim().toLowerCase();
  const {products,categories,offers}=await getCatalog();
  const foundCategories=query?categories.filter(category=>category.name.toLowerCase().includes(query)):[];
  const found=query?products.filter(product=>
    product.name.toLowerCase().includes(query) ||
    product.description?.toLowerCase().includes(query) ||
    product.categories?.name.toLowerCase().includes(query)
  ):products;

  return <div className="container-shell py-14">
    <p className="eyebrow">Catalogue complet</p>
    <h1 className="display mt-3 text-5xl">Que recherchez-vous ?</h1>
    <form className="relative mt-8 max-w-2xl">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ink/35"/>
      <input name="q" defaultValue={query} className="field !rounded-full !py-4 !pl-14" placeholder="Miroir, composite, pince…"/>
    </form>
    {foundCategories.length > 0 && <div className="mt-8">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-ink/45">Catégories correspondantes</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {foundCategories.map(category=><Link key={category.id} href={`/category/${category.slug}`} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-bold transition hover:border-sage hover:text-sage">{category.name}</Link>)}
      </div>
    </div>}
    {!products.length ? <div className="mt-10"><EmptyState title="Notre catalogue arrive bientôt" text="La sélection DENTALNOVA est en cours de préparation."/></div> : <>
      <p className="mt-8 text-sm text-ink/50">{found.length} résultat{found.length!==1?"s":""}{query&&<> pour « {query} »</>}</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{found.map(product=><ProductCard key={product.id} product={product} offers={offers}/>)}</div>
    </>}
  </div>;
}
