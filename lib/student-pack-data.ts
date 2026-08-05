import {createClient,hasSupabaseEnv} from "./supabase/server";
import type {AcademicYear,StudentPack,StudentRecommendation,University} from "./student-packs";
import {isPublicImageUrl,sanitizeProductImages} from "./image-url";

const packSelect="*,universities(*),academic_years(*),student_pack_components(*,products(*,categories(*)))";

function sanitizePack(pack:StudentPack):StudentPack{return {...pack,
  image_url:isPublicImageUrl(pack.image_url)?pack.image_url:null,
  universities:pack.universities?{...pack.universities,image_url:isPublicImageUrl(pack.universities.image_url)?pack.universities.image_url:null}:undefined,
  student_pack_components:(pack.student_pack_components||[]).map(component=>({...component,products:component.products?sanitizeProductImages(component.products):undefined})),
}}

export async function getStudentPackCatalog(){
  if(!hasSupabaseEnv)return {universities:[] as University[],years:[] as AcademicYear[],packs:[] as StudentPack[],recommendations:[] as StudentRecommendation[],available:false};
  const db=createClient();
  const [u,y,p,r]=await Promise.all([
    db.from("universities").select("*").order("display_order"),
    db.from("academic_years").select("*").order("display_order"),
    db.from("student_packs").select(packSelect).order("display_order"),
    db.from("student_recommended_products").select("*,academic_years(*),products(*,categories(*))").eq("is_active",true).order("display_order"),
  ]);
  return {universities:((u.data||[]) as University[]).map(university=>({...university,image_url:isPublicImageUrl(university.image_url)?university.image_url:null})),years:(y.data||[]) as AcademicYear[],
    packs:((p.data||[]) as unknown as StudentPack[]).map(sanitizePack),recommendations:((r.data||[]) as unknown as StudentRecommendation[]).map(recommendation=>({...recommendation,products:recommendation.products?sanitizeProductImages(recommendation.products):undefined})),
    available:!u.error&&!y.error&&!p.error&&!r.error};
}

export async function getStudentPack(slug:string){
  if(!hasSupabaseEnv)return null;
  const {data,error}=await createClient().from("student_packs").select(packSelect).eq("slug",slug).maybeSingle();
  if(error)throw new Error("Unable to load the published student pack");
  return data?sanitizePack(data as unknown as StudentPack):null;
}
