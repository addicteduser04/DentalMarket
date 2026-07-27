import { redirect } from "next/navigation";
export default function LegacyEditProduct({params}:{params:{id:string}}){redirect(`/admin/products/${params.id}`)}
