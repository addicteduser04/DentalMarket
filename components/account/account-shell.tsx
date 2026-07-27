import type { ReactNode } from "react";
import { AccountNav } from "./account-nav";

export function AccountShell({children,isAdmin,title,eyebrow="Espace personnel"}:{children:ReactNode;isAdmin:boolean;title:string;eyebrow?:string}) {
  return <div className="account-center">
    <div className="container-shell grid gap-6 py-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-10">
      <AccountNav isAdmin={isAdmin}/>
      <main className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-white md:text-5xl">{title}</h1>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  </div>;
}
