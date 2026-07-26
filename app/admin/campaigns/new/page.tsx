import { CampaignForm } from "@/components/admin/campaign-form";import { getCatalog } from "@/lib/data";
export default async function NewCampaign(){const {offers}=await getCatalog();return <><p className="eyebrow">Acquisition</p><h1 className="display mt-2 text-4xl">Nouvelle campagne</h1><CampaignForm offers={offers}/></>}
