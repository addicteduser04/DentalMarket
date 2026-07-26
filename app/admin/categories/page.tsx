import { CategoryManager } from "@/components/admin/category-manager";import { getCatalog } from "@/lib/data";
export default async function Categories(){const {categories}=await getCatalog();return <><p className="eyebrow">Organisation</p><h1 className="display mt-2 text-4xl">Catégories</h1><CategoryManager categories={categories}/></>}
