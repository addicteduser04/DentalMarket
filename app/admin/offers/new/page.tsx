import { OfferForm } from "@/components/admin/offer-form";import { getCatalog } from "@/lib/data";
export default async function NewOffer(){const {categories,products}=await getCatalog();return <><p className="eyebrow">Promotions</p><h1 className="display mt-2 text-4xl">Nouvelle offre</h1><OfferForm categories={categories} products={products}/></>}
