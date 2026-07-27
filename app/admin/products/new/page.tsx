import { ProductForm } from "@/components/admin/product-form";import { createClient } from "@/lib/supabase/server";
export default async function NewProduct(){const {data}=await createClient().from("categories").select("*").order("display_order");return <ProductForm categories={data||[]}/>}
