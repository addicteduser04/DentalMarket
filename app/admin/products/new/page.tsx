import { ProductForm } from "@/components/admin/product-form";import { getCatalog } from "@/lib/data";
export default async function NewProduct(){const {categories}=await getCatalog();return <><p className="eyebrow">Catalogue</p><h1 className="display mt-2 text-4xl">Nouveau produit</h1><ProductForm categories={categories}/></>}
