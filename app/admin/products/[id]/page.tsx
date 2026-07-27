import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";
export default async function ProductManagementPage({params}:{params:{id:string}}){const db=createClient();const [{data:product},{data:categories}]=await Promise.all([db.from("products").select("*,categories(*)").eq("id",params.id).maybeSingle(),db.from("categories").select("*").order("display_order")]);if(!product)notFound();return <ProductForm categories={categories||[]} product={product}/>}
