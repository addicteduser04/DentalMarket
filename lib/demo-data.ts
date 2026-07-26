import type { Campaign, Category, Offer, Product } from "./types";

export const demoCategories: Category[] = [
  { id: "cat-restauration", name: "Restauration", slug: "restauration", display_order: 1 },
  { id: "cat-diagnostic", name: "Diagnostic", slug: "diagnostic", display_order: 2 },
  { id: "cat-endo", name: "Endodontie", slug: "endodontie", display_order: 3 },
  { id: "cat-ortho", name: "Orthodontie", slug: "orthodontie", display_order: 4 }
];
const img = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=900&q=85`;
export const demoProducts: Product[] = [
  { id:"p1", name:"Kit d’examen Essentiel", slug:"kit-examen-essentiel", description:"L’essentiel pour vos premiers gestes cliniques : miroir, sonde et précelle en acier inoxydable.", price:249, compare_at_price:299, category_id:"cat-diagnostic", images:[img("photo-1609840114035-3c981b782dfe")], stock_status:"in_stock", target_audience:"both", variations:[], is_active:true, is_featured:true },
  { id:"p2", name:"Composite Nano Hybrid", slug:"composite-nano-hybrid", description:"Composite universel photopolymérisable, excellente manipulation et rendu naturel.", price:189, compare_at_price:null, category_id:"cat-restauration", images:[img("photo-1588776814546-1ffcf47267a5")], stock_status:"in_stock", target_audience:"professional", variations:[{label:"A1",price:189},{label:"A2",price:189},{label:"A3",price:189}], is_active:true, is_featured:true },
  { id:"p3", name:"Digue dentaire Premium", slug:"digue-dentaire-premium", description:"Feuilles sans latex à contraste élevé pour une isolation confortable.", price:135, compare_at_price:null, category_id:"cat-endo", images:[img("photo-1606811971618-4486d14f3f99")], stock_status:"on_order", target_audience:"both", variations:[], is_active:true, is_featured:true },
  { id:"p4", name:"Pince orthodontique Weingart", slug:"pince-weingart", description:"Précision, grip sûr et équilibre optimal pour le cabinet.", price:420, compare_at_price:495, category_id:"cat-ortho", images:[img("photo-1606265752439-1f18756aa376")], stock_status:"in_stock", target_audience:"professional", variations:[], is_active:true, is_featured:true }
];
export const demoOffers: Offer[] = [{ id:"o1", name:"Rentrée clinique", badge_text:"-15%", discount_type:"percentage", discount_value:15, scope:"all", category_id:null, product_id:null, starts_at:"2024-01-01", ends_at:null, is_active:true }];
export const demoCampaigns: Campaign[] = [{ id:"c1", name:"Pack rentrée", slug:"rentree", banner_image_url:null, banner_link:"/category/diagnostic", offer_id:"o1", starts_at:"2024-01-01", ends_at:null, is_active:true }];
