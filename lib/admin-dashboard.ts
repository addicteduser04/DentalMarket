import {isCampaignActive} from "./campaigns";
import {isOfferActive} from "./offers";
import type {Campaign,Offer} from "./types";

export type DashboardItem={item_type?:string;product_id?:string;pack_id?:string;name?:string;qty?:number;price?:number};
export type DashboardSubmission={created_at:string;estimated_total:number|null;campaign_slug:string|null;items:unknown};
export type CountResult={count:number|null;error:null|{code?:string}};
export type DataResult<T>={data:T[]|null;error:null|{code?:string}};

const daysBefore=(now:Date,days:number)=>new Date(now.getTime()-days*24*60*60*1000);
const amount=(value:unknown)=>{const number=Number(value);return Number.isFinite(number)?number:0};
const roundMoney=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;

export function aggregateDashboard(submissions:DashboardSubmission[],now=new Date()){
  const sevenStart=daysBefore(now,7),thirtyStart=daysBefore(now,30);
  const within=(submission:DashboardSubmission,start:Date)=>{const date=new Date(submission.created_at);return Number.isFinite(date.getTime())&&date>=start&&date<=now};
  const last30=submissions.filter(row=>within(row,thirtyStart)),last7=last30.filter(row=>within(row,sevenStart));
  const window=(rows:DashboardSubmission[])=>({count:rows.length,total:roundMoney(rows.reduce((sum,row)=>sum+amount(row.estimated_total),0))});
  const products=new Map<string,{id:string;name:string;frequency:number}>();
  last30.forEach(submission=>{
    if(!Array.isArray(submission.items))return;
    submission.items.forEach(raw=>{
      if(!raw||typeof raw!=="object")return;
      const item=raw as DashboardItem;if(item.item_type==="student_pack"||item.pack_id)return;
      const productId=typeof item.product_id==="string"&&item.product_id?item.product_id:null,nameValue=typeof item.name==="string"&&item.name.trim()?item.name.trim():null;
      if(!productId&&!nameValue)return;
      const name=nameValue??"Produit sans nom",id=productId??`legacy:${name.toLocaleLowerCase("fr")}`;
      const current=products.get(id)??{id,name,frequency:0};current.frequency+=1;products.set(id,current);
    });
  });
  const topProducts=[...products.values()].sort((a,b)=>b.frequency-a.frequency||a.name.localeCompare(b.name,"fr")||a.id.localeCompare(b.id)).slice(0,10);
  const attribution=new Map<string,{slug:string|null,count:number,total:number}>();
  last30.forEach(row=>{const slug=typeof row.campaign_slug==="string"&&row.campaign_slug.trim()?row.campaign_slug.trim():null,key=slug??"__none__",current=attribution.get(key)??{slug,count:0,total:0};current.count+=1;current.total+=amount(row.estimated_total);attribution.set(key,current)});
  const campaigns=[...attribution.values()].map(row=>({...row,total:roundMoney(row.total)})).sort((a,b)=>b.count-a.count||b.total-a.total||(a.slug??"").localeCompare(b.slug??"","fr"));
  return {sevenDays:window(last7),thirtyDays:window(last30),topProducts,campaigns,periodStart:thirtyStart.toISOString(),periodEnd:now.toISOString()};
}

export function countCurrentActivities(offers:Offer[],campaigns:Campaign[],now=new Date()){
  return {offers:offers.filter(item=>isOfferActive(item,now)).length,campaigns:campaigns.filter(item=>isCampaignActive(item,now)).length};
}
export function countNonInStock(statuses:string[]){return statuses.filter(status=>status!=="in_stock").length}

export function buildDashboardState(input:{submissions:DataResult<DashboardSubmission>;stock:CountResult;offers:CountResult;campaigns:CountResult},now=new Date()){
  const failed=Object.entries(input).filter(([,result])=>result.error).map(([name,result])=>({name,code:result.error?.code}));
  if(failed.length)return {ok:false as const,failed};
  return {ok:true as const,metrics:{...aggregateDashboard(input.submissions.data??[],now),nonInStockProducts:input.stock.count??0,activeOffers:input.offers.count??0,activeCampaigns:input.campaigns.count??0}};
}
