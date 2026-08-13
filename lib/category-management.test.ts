import {describe,expect,it} from "vitest";
import {categoryMutationError,validateCategoryDraft} from "./category-management";
import type {Category} from "./types";
import {readFileSync} from "node:fs";

const categories:Category[]=[
  {id:"root-a",name:"Ancien nom",slug:"ancien-nom",parent_id:null},
  {id:"root-b",name:"Autre",slug:"autre",parent_id:null},
  {id:"child-a",name:"Enfant",slug:"enfant",parent_id:"root-a"},
];

describe("category editing",()=>{
  it("accepts an existing category name and slug update",()=>{
    expect(validateCategoryDraft(categories,"root-b",{name:"Nouveau nom",slug:"nouveau-nom",parent_id:null})).toEqual({valid:true,data:{name:"Nouveau nom",slug:"nouveau-nom",parent_id:null}});
  });

  it("keeps cancel as a local state action with no Supabase update",()=>{
    const component=readFileSync("components/admin/category-manager.tsx","utf8");
    expect(component).toContain("function cancelEdit(){setEditing(null);setMessage(\"\")}");
    expect(component).toContain('type="button" onClick={cancelEdit}');
  });

  it("rejects self-parenting",()=>{
    const result=validateCategoryDraft(categories,"root-b",{name:"Autre",slug:"autre",parent_id:"root-b"});
    expect(result).toEqual({valid:false,error:"Une catégorie ne peut pas être son propre parent."});
  });

  it("rejects second-level nesting",()=>{
    const result=validateCategoryDraft(categories,null,{name:"Petit-enfant",slug:"petit-enfant",parent_id:"child-a"});
    expect(result).toEqual({valid:false,error:"Une sous-catégorie ne peut pas contenir une autre sous-catégorie."});
  });

  it("reports a useful Supabase uniqueness error without claiming success",()=>{
    expect(categoryMutationError("modifier","23505")).toBe("Ce slug est déjà utilisé par une autre catégorie.");
    const component=readFileSync("components/admin/category-manager.tsx","utf8");
    expect(component).toContain('if(error){setMessage(categoryMutationError("modifier",error.code));return}');
    expect(component.indexOf('setMessage("Catégorie modifiée.")')).toBeGreaterThan(component.indexOf('if(error){setMessage(categoryMutationError("modifier",error.code));return}'));
  });

  it("preserves create and delete operations",()=>{
    const component=readFileSync("components/admin/category-manager.tsx","utf8");
    expect(component).toContain('.from("categories").insert(');
    expect(component).toContain('.from("categories").delete().eq("id",id)');
  });
});
