import Link from "next/link";
import { PackageX } from "lucide-react";
export default function ProductNotFound(){return <div className="card grid min-h-[420px] place-items-center p-8 text-center"><div><PackageX className="mx-auto text-cyan-300" size={34}/><p className="eyebrow mt-5">Produit introuvable</p><h1 className="display mt-3 text-3xl">Cette fiche produit n’existe pas</h1><p className="mt-3 text-sm text-white/50">Le produit a peut-être été archivé ou supprimé.</p><Link href="/admin/products" className="button mt-6">Retour aux produits</Link></div></div>}
