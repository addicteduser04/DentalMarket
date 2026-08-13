import {CampaignForm} from "@/components/admin/campaign-form";
import {createClient} from "@/lib/supabase/server";
import type {Campaign,Offer} from "@/lib/types";
export default async function NewCampaign(){const db=createClient(),[offersResult,campaignsResult]=await Promise.all([db.from("offers").select("*").order("name"),db.from("campaigns").select("*")]);return <><p className="eyebrow">Acquisition</p><h1 className="display mt-2 text-4xl">Nouvelle campagne</h1><CampaignForm offers={(offersResult.data??[]) as Offer[]} campaigns={(campaignsResult.data??[]) as Campaign[]}/></>}
