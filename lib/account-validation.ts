export const CUSTOMER_TYPES = ["student", "professional"] as const;
export const LANGUAGES = ["fr", "ar"] as const;

export type ProfileInput = {
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  user_type: string;
  clinic_name: string;
  preferred_language: string;
};

export function normalizeMoroccanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0[5-7]\d{8}$/.test(digits)) return `+212${digits.slice(1)}`;
  if (/^212[5-7]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^[5-7]\d{8}$/.test(digits)) return `+212${digits}`;
  return null;
}

export function validateProfile(input: ProfileInput) {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};
  const clean = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    display_name: input.display_name.trim(),
    phone: normalizeMoroccanPhone(input.phone),
    user_type: input.user_type,
    clinic_name: input.clinic_name.trim(),
    preferred_language: input.preferred_language,
  };
  if (!clean.first_name || clean.first_name.length > 60) errors.first_name = "Prénom requis (60 caractères maximum).";
  if (!clean.last_name || clean.last_name.length > 60) errors.last_name = "Nom requis (60 caractères maximum).";
  if (!clean.display_name || clean.display_name.length > 80) errors.display_name = "Nom affiché requis (80 caractères maximum).";
  if (!clean.phone) errors.phone = "Saisissez un numéro marocain valide.";
  if (!CUSTOMER_TYPES.includes(clean.user_type as typeof CUSTOMER_TYPES[number])) errors.user_type = "Profession invalide.";
  if (clean.clinic_name.length > 120) errors.clinic_name = "120 caractères maximum.";
  if (!LANGUAGES.includes(clean.preferred_language as typeof LANGUAGES[number])) errors.preferred_language = "Langue invalide.";
  return { valid: Object.keys(errors).length === 0, errors, data: clean };
}

export function validateEmailChange(currentEmail: string, nextEmail: string) {
  const normalized = nextEmail.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  return {
    changed: normalized !== currentEmail.trim().toLowerCase(),
    valid,
    email: normalized,
    requiresConfirmation: valid && normalized !== currentEmail.trim().toLowerCase(),
  };
}

export function passwordStrength(password: string) {
  const checks = [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  return { score, valid: score >= 4 && checks[0], label: score < 3 ? "Faible" : score < 5 ? "Correct" : "Fort" };
}

export function validateCasablancaAddress(input: {
  recipient_name: string; phone: string; address_line: string; district: string;
  postal_code?: string; delivery_instructions?: string; city: string;
}) {
  const phone = normalizeMoroccanPhone(input.phone);
  const errors: Record<string,string> = {};
  if (!input.recipient_name.trim()) errors.recipient_name = "Destinataire requis.";
  if (!phone) errors.phone = "Numéro marocain invalide.";
  if (!input.address_line.trim()) errors.address_line = "Adresse requise.";
  if (!input.district.trim()) errors.district = "Quartier requis.";
  if (input.city !== "Casablanca") errors.city = "La livraison est limitée à Casablanca.";
  return { valid: !Object.keys(errors).length, errors, data: { ...input, phone, city: "Casablanca" as const } };
}

export function accountNavigation(isAdmin: boolean) {
  const base = [
    "Vue d’ensemble", "Mon profil", "Mes favoris", "Mes demandes et commandes",
    "Adresses et livraison", "Sécurité", "Notifications",
  ];
  return isAdmin ? [...base, "Administration"] : base;
}
