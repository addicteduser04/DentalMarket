import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { CampaignCapture } from "@/components/storefront/campaign-capture";
import {getLocale} from "@/lib/i18n-server";
export const metadata:Metadata={
  metadataBase:new URL("https://dental-market-bay.vercel.app"),
  title:{default:"DENTANOVA | Matériel dentaire professionnel au Maroc",template:"%s · DENTANOVA"},
  description:"DENTANOVA fournit du matériel dentaire professionnel avec livraison partout au Maroc.",
  openGraph:{
    title:"DENTANOVA | Matériel dentaire professionnel au Maroc",
    description:"Une sélection professionnelle de matériel dentaire, livrée partout au Maroc.",
    type:"website",
    locale:"fr_MA",
    images:[{url:"/opengraph-image.png",width:1200,height:630,alt:"DENTANOVA"}],
  },
};
export default function RootLayout({children}:{children:React.ReactNode}){const locale=getLocale();return <html lang={locale} dir={locale==="ar"?"rtl":"ltr"}><body><Suspense><CampaignCapture/></Suspense><Header locale={locale}/><main className="min-h-[70vh]">{children}</main><Footer/><Analytics/></body></html>}
