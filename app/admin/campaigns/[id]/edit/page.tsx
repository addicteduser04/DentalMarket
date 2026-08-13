import {notFound} from "next/navigation";
import {CampaignForm} from "@/components/admin/campaign-form";
import {createClient} from "@/lib/supabase/server";
import type {Campaign,Offer} from "@/lib/types";
export default async function EditCampaign({params}:{params:{id:string}}){const db=createClient(),[campaignResult,campaignsResult,offersResult]=await Promise.all([db.from("campaigns").select("*").eq("id",params.id).single(),db.from("campaigns").select("*"),db.from("offers").select("*").order("name")]);if(!campaignResult.data)notFound();return <><p className="eyebrow">Acquisition</p><h1 className="display mt-2 text-4xl">Modifier la campagne</h1><CampaignForm campaign={campaignResult.data as Campaign} campaigns={(campaignsResult.data??[]) as Campaign[]} offers={(offersResult.data??[]) as Offer[]}/></>}
