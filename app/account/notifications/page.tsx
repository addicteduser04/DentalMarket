import { AccountShell } from "@/components/account/account-shell";
import { NotificationsForm } from "@/components/account/notifications-form";
import { requireAccount } from "@/lib/account-server";
export default async function NotificationsPage(){const {profile,isAdmin}=await requireAccount();return <AccountShell isAdmin={isAdmin} title="Notifications"><NotificationsForm initial={profile||{}}/></AccountShell>}
