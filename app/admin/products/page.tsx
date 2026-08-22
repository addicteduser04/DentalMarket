import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductActions } from "@/components/admin/product-actions";
import { money } from "@/lib/utils";

export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string;stock?:string}>}){
  const db=createClient(),filters=await searchParams;
  const [{data:products},{data:categories}]=await Promise.all([
    db.from("products").select("*").order("updated_at",{ascending:false}),
    db.from("categories").select("*").order("display_order"),
  ]);
  const allProducts=products||[],allCategories=categories||[],query=(filters.q||"").toLowerCase();
  const rows=allProducts.filter(product=>
    (!query||product.name.toLowerCase().includes(query))&&
    (!filters.stock||product.stock_status===filters.stock)
  );
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Catalogue</p><h1 className="display mt-2 text-4xl">Produits</h1><p className="mt-2 text-sm text-white/45">{allProducts.length} produit{allProducts.length!==1?"s":""}, tous statuts confondus</p></div><Link href="/admin/products/new" className="button">Nouveau produit</Link></div>
    <form className="mt-7 flex flex-col gap-3 sm:flex-row"><input name="q" defaultValue={filters.q} className="field" placeholder="Rechercher un produit"/><select name="stock" className="field max-w-48" defaultValue={filters.stock}><option value="">Tous les stocks</option><option value="in_stock">En stock</option><option value="on_order">Sur commande</option><option value="out_of_stock">Épuisé</option></select><button className="button">Filtrer</button></form>
    <div className="card mt-5 overflow-x-auto p-2"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-white/40"><tr><th className="p-3">Produit</th><th>Référence</th><th>Publication</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{rows.map(product=><tr className="cursor-pointer border-t border-white/10" key={product.id}><td className="p-3 font-bold"><Link className="block py-2 hover:text-cyan-300" href={`/admin/products/${product.id}`}>{product.name}</Link></td><td className="text-white/45">{product.sku||"—"}</td><td><span className="account-badge">{product.publication_status||(product.is_active?"Publié":"Brouillon")}</span></td><td>{allCategories.find(category=>category.id===product.category_id)?.name||"—"}</td><td>{product.price_mode==="contact"?"Sur demande":money(Number(product.price))}</td><td>{product.availability_status||product.stock_status}</td><td><ProductActions id={product.id} active={product.is_active}/></td></tr>)}</tbody></table>{!rows.length&&<p className="p-8 text-center text-sm text-white/45">Aucun produit ne correspond aux filtres.</p>}</div>
  </>
}
