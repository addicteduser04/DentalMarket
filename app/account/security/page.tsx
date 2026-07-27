import { AccountShell } from "@/components/account/account-shell";
import { SecurityForm } from "@/components/account/security-form";
import { requireAccount } from "@/lib/account-server";
export default async function SecurityPage(){const {user,isAdmin}=await requireAccount();return <AccountShell isAdmin={isAdmin} title="Sécurité"><SecurityForm email={user.email||""} emailVerified={Boolean(user.email_confirmed_at)} lastSignIn={user.last_sign_in_at} mustChangePassword={isAdmin&&user.user_metadata?.must_change_password===true}/></AccountShell>}
