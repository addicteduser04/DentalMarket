import {slugify} from "./utils";
import type {Category} from "./types";

export type CategoryDraft={name:string;slug:string;parent_id:string|null};
export type CategoryValidation={valid:true;data:CategoryDraft}|{valid:false;error:string};

export function validateCategoryDraft(categories:Category[],currentId:string|null,draft:CategoryDraft):CategoryValidation{
  const name=draft.name.trim(),slug=slugify(draft.slug.trim()),parentId=draft.parent_id||null;
  if(!name)return {valid:false,error:"Le nom de la catégorie est requis."};
  if(!slug)return {valid:false,error:"Le slug de la catégorie est requis."};
  if(categories.some(category=>category.id!==currentId&&category.slug===slug))return {valid:false,error:"Ce slug est déjà utilisé par une autre catégorie."};
  if(parentId===currentId)return {valid:false,error:"Une catégorie ne peut pas être son propre parent."};
  if(parentId){
    const parent=categories.find(category=>category.id===parentId);
    if(!parent)return {valid:false,error:"La catégorie parente sélectionnée est introuvable."};
    if(parent.parent_id)return {valid:false,error:"Une sous-catégorie ne peut pas contenir une autre sous-catégorie."};
    if(currentId&&categories.some(category=>category.parent_id===currentId))return {valid:false,error:"Une catégorie qui contient des sous-catégories ne peut pas devenir une sous-catégorie."};
    const visited=new Set<string>();
    let ancestor:Category|undefined=parent;
    while(ancestor&&!visited.has(ancestor.id)){
      if(ancestor.id===currentId)return {valid:false,error:"Cette relation créerait un cycle de catégories."};
      visited.add(ancestor.id);
      ancestor=ancestor.parent_id?categories.find(category=>category.id===ancestor?.parent_id):undefined;
    }
  }
  return {valid:true,data:{name,slug,parent_id:parentId}};
}

export function categoryMutationError(operation:"ajouter"|"modifier"|"supprimer",code?:string){
  if(code==="23505")return "Ce slug est déjà utilisé par une autre catégorie.";
  return `Impossible de ${operation} cette catégorie. Réessayez.`;
}
