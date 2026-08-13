import {isPublicImageUrl} from "./image-url";
import type {Campaign,Offer} from "./types";
import {slugify} from "./utils";

export const CAMPAIGN_STORAGE_KEY="active_campaign_slug";
export type CampaignDraft=Pick<Campaign,"name"|"slug"|"banner_image_url"|"banner_link"|"offer_id"|"starts_at"|"ends_at"|"is_active">;

export function isCampaignActive(campaign:Campaign,now=new Date()){
  const start=new Date(campaign.starts_at),end=campaign.ends_at?new Date(campaign.ends_at):null;
  return campaign.is_active&&Number.isFinite(start.getTime())&&(!end||Number.isFinite(end.getTime()))&&start<=now&&(!end||end>=now);
}
export function normalizeCampaignSlug(value:string){return slugify(value)}
export function isValidCampaignRef(value:string){return Boolean(value)&&value===normalizeCampaignSlug(value)&&!/[?&=]/.test(value)}

export function validateCampaignDraft(draft:CampaignDraft,campaigns:Campaign[],offers:Offer[],currentId?:string){
  const rawSlug=(draft.slug||draft.name).trim();
  const data:CampaignDraft={...draft,name:draft.name.trim(),slug:normalizeCampaignSlug(draft.slug||draft.name),banner_image_url:draft.banner_image_url?.trim()||null,banner_link:draft.banner_link?.trim()||null,offer_id:draft.offer_id||null,ends_at:draft.ends_at||null};
  const errors:Partial<Record<keyof CampaignDraft,string>>={};
  if(!data.name)errors.name="Le nom de la campagne est requis.";
  if(/[?&=]/.test(rawSlug)||!data.slug||!isValidCampaignRef(data.slug))errors.slug="Utilisez un slug valide sans ?, & ou =.";
  else if(campaigns.some(item=>item.id!==currentId&&item.slug===data.slug))errors.slug="Ce slug est déjà utilisé.";
  if(data.banner_image_url&&!isPublicImageUrl(data.banner_image_url))errors.banner_image_url="Utilisez une URL d’image publique valide.";
  if(data.offer_id&&!offers.some(offer=>offer.id===data.offer_id))errors.offer_id="Sélectionnez une offre valide ou aucune offre.";
  const start=new Date(data.starts_at),end=data.ends_at?new Date(data.ends_at):null;
  if(!data.starts_at||!Number.isFinite(start.getTime()))errors.starts_at="La date de début est invalide.";
  if(end&&!Number.isFinite(end.getTime()))errors.ends_at="La date de fin est invalide.";
  else if(end&&Number.isFinite(start.getTime())&&end<start)errors.ends_at="La date de fin ne peut pas précéder la date de début.";
  return {data,errors,valid:Object.keys(errors).length===0};
}
export function campaignMutationError(error:{code?:string}|null){if(!error)return "";return error.code==="23505"?"Ce slug est déjà utilisé.":"Impossible d’enregistrer la campagne. Vérifiez les informations puis réessayez."}

export async function captureCampaignRef(slug:string|null,isValid:(slug:string)=>Promise<boolean>,storage:Pick<Storage,"setItem">){
  if(!slug||!isValidCampaignRef(slug))return false;
  if(!await isValid(slug))return false;
  storage.setItem(CAMPAIGN_STORAGE_KEY,slug);return true;
}

export function campaignBannerModel(campaign:Campaign|null,now=new Date()){
  if(!campaign||!isCampaignActive(campaign,now))return null;
  return {name:campaign.name,imageUrl:isPublicImageUrl(campaign.banner_image_url)?campaign.banner_image_url:null,href:campaign.banner_link?.trim()||null};
}
