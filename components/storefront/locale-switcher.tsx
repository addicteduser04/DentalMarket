"use client";
import type {Locale} from "@/lib/i18n";
export function LocaleSwitcher({locale}:{locale:Locale}){
 function change(next:Locale){document.cookie=`dentanova_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;window.location.reload()}
 return <button className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold" aria-label={locale==="fr"?"العربية":"Français"} onClick={()=>change(locale==="fr"?"ar":"fr")}>{locale==="fr"?"AR":"FR"}</button>;
}
