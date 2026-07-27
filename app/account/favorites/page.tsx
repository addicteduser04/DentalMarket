import { AccountShell } from "@/components/account/account-shell";
import { FavoritesList } from "@/components/account/favorites-list";
import { requireAccount } from "@/lib/account-server";
export default async function FavoritesPage(){const {db,isAdmin}=await requireAccount();const {data}=await db.from("favorites").select("created_at,products(*,categories(name,slug))").order("created_at",{ascending:false});const initial=(data||[]).map((row:any)=>({created_at:row.created_at,product:row.products})).filter(row=>row.product);return <AccountShell isAdmin={isAdmin} title="Mes favoris"><FavoritesList initial={initial}/></AccountShell>}
