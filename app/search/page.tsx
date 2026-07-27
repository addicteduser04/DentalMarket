import { Search } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { getCatalog } from "@/lib/data";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SearchPage({searchParams}:{searchParams:{q?:string}}) {
  const query=(searchParams.q||"").trim().toLowerCase();
  const {products,offers}=await getCatalog();
  const found=query?products.filter(product=>product.name.toLowerCase().includes(query)):products;

  return <div className="container-shell py-14">
    <p className="eyebrow">Catalogue complet</p>
    <h1 className="display mt-3 text-5xl">Que recherchez-vous ?</h1>
    <form className="relative mt-8 max-w-2xl">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ink/35"/>
      <input name="q" defaultValue={query} className="field !rounded-full !py-4 !pl-14" placeholder="Miroir, composite, pince…"/>
    </form>
    {!products.length ? <div className="mt-10"><EmptyState title="Notre catalogue arrive bientôt" text="La sélection DENTALNOVA est en cours de préparation."/></div> : <>
      <p className="mt-8 text-sm text-ink/50">{found.length} résultat{found.length!==1?"s":""}{query&&<> pour « {query} »</>}</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{found.map(product=><ProductCard key={product.id} product={product} offers={offers}/>)}</div>
    </>}
  </div>;
}
