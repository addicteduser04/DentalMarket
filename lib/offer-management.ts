import type { Category, Offer, Product } from "./types";

export type OfferDraft = Pick<Offer,"name"|"badge_text"|"discount_type"|"discount_value"|"scope"|"category_id"|"product_id"|"starts_at"|"ends_at"|"is_active">;

export function validateOfferDraft(draft: OfferDraft, categories: Category[], products: Product[]) {
  const data: OfferDraft = {
    ...draft,
    name: draft.name.trim(),
    badge_text: draft.badge_text?.trim() || null,
    category_id: draft.scope === "category" ? draft.category_id : null,
    product_id: draft.scope === "product" ? draft.product_id : null,
    ends_at: draft.ends_at || null,
  };
  const errors: Partial<Record<keyof OfferDraft,string>> = {};
  if (!data.name) errors.name = "Le nom de l’offre est requis.";
  if (!Number.isFinite(data.discount_value) || data.discount_value <= 0) errors.discount_value = "La réduction doit être supérieure à 0.";
  if (data.discount_type === "percentage" && data.discount_value > 100) errors.discount_value = "Le pourcentage doit être inférieur ou égal à 100.";
  const start = new Date(data.starts_at);
  const end = data.ends_at ? new Date(data.ends_at) : null;
  if (!data.starts_at || !Number.isFinite(start.getTime())) errors.starts_at = "La date de début est invalide.";
  if (end && !Number.isFinite(end.getTime())) errors.ends_at = "La date de fin est invalide.";
  else if (end && Number.isFinite(start.getTime()) && end < start) errors.ends_at = "La date de fin ne peut pas précéder la date de début.";
  if (data.scope === "product" && !products.some(product => product.id === data.product_id)) errors.product_id = "Sélectionnez un produit valide.";
  if (data.scope === "category" && !categories.some(category => category.id === data.category_id)) errors.category_id = "Sélectionnez une catégorie valide.";
  return {data, errors, valid:Object.keys(errors).length === 0};
}

export function offerMutationError(error: {code?:string;message?:string}|null) {
  if (!error) return "";
  if (error.code === "23514") return "L’offre ne respecte pas les contraintes de réduction ou de portée.";
  return "Impossible d’enregistrer l’offre. Vérifiez les informations puis réessayez.";
}
