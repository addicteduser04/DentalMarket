// Shared helper for student-pack component logical identity
// Usable from both Node import scripts and the TypeScript front-end (tsconfig.allowJs = true)
export function componentLogicalKey(component){
  // Support different shapes: product_id (uuid) or source_product_id (string)
  const productKey = component.product_id || component.source_product_id || "";
  const variationKey = component.variation_id || component.variation_source_id || component.variationSourceId || null;
  const NULL_SENTINEL = "__NULL_VARIATION__";
  return `${String(productKey)}::${variationKey===null||variationKey===undefined||variationKey===""?NULL_SENTINEL:String(variationKey)}`;
}

export function normalizeComponents(components){
  // Deduplicate by logical key. Returns {normalized:[], conflicts:[]}
  const map = new Map();
  const conflicts = [];
  const normalized = [];
  for(const comp of components){
    const key = componentLogicalKey(comp);
    if(!map.has(key)){
      map.set(key, comp);
      normalized.push(comp);
    } else {
      const existing = map.get(key);
      // Compare non-identity fields that must match: quantity,is_required,display_order,price_snapshot,source_bundle_item_id,notes
      const fields = ["quantity","is_required","display_order","price_snapshot","source_bundle_item_id","notes","replacement_policy"];
      let equal = true;
      for(const f of fields){
        const a = existing[f]==null?null:existing[f];
        const b = comp[f]==null?null:comp[f];
        if(String(a) !== String(b)) { equal = false; break; }
      }
      if(!equal){
        conflicts.push({key,existing,conflicting:comp});
      } else {
        // exact duplicate — keep first (do nothing)
      }
    }
  }
  return {normalized,conflicts};
}
