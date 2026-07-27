import { ProfileForm } from "@/components/account/profile-form";
import { AccountShell } from "@/components/account/account-shell";
import { requireAccount } from "@/lib/account-server";
export default async function ProfilePage(){const {user,profile,isAdmin}=await requireAccount();return <AccountShell isAdmin={isAdmin} title="Mon profil"><ProfileForm email={user.email||""} initial={profile||{}}/></AccountShell>}
