import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { CampaignCapture } from "@/components/storefront/campaign-capture";
export const metadata:Metadata={title:{default:"Dental Market Maroc",template:"%s · Dental Market"},description:"Instruments dentaires pour étudiants et professionnels au Maroc."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><Suspense><CampaignCapture/></Suspense><Header/><main className="min-h-[70vh]">{children}</main><Footer/><Analytics/></body></html>}
