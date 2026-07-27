import { describe, expect, it } from "vitest";
import {
  accountNavigation, normalizeMoroccanPhone, passwordStrength,
  validateCasablancaAddress, validateEmailChange, validateProfile,
} from "./account-validation";

describe("account profile validation", () => {
  it("normalizes a Moroccan phone and accepts safe customer fields", () => {
    expect(normalizeMoroccanPhone("06 59 54 78 79")).toBe("+212659547879");
    const result = validateProfile({
      first_name:"Aya", last_name:"Benali", display_name:"Dr Aya", phone:"0659547879",
      user_type:"professional", clinic_name:"Cabinet Aya", preferred_language:"fr",
    });
    expect(result.valid).toBe(true);
    expect(result.data.phone).toBe("+212659547879");
    expect(result.data).not.toHaveProperty("role");
  });

  it("rejects invalid profile values", () => {
    expect(validateProfile({
      first_name:"", last_name:"", display_name:"", phone:"123", user_type:"admin",
      clinic_name:"", preferred_language:"en",
    }).valid).toBe(false);
  });
});

describe("secure account changes", () => {
  it("requires confirmation for an email change", () => {
    expect(validateEmailChange("old@example.ma", "new@example.ma")).toMatchObject({
      valid:true, changed:true, requiresConfirmation:true,
    });
  });

  it("requires a strong password", () => {
    expect(passwordStrength("short").valid).toBe(false);
    expect(passwordStrength("DENTALNOVA!2026").valid).toBe(true);
  });
});

describe("delivery and navigation", () => {
  it("accepts Casablanca and rejects every other city", () => {
    const base={recipient_name:"Aya",phone:"0659547879",address_line:"10 rue",district:"Maarif"};
    expect(validateCasablancaAddress({...base,city:"Casablanca"}).valid).toBe(true);
    expect(validateCasablancaAddress({...base,city:"Rabat"}).valid).toBe(false);
  });

  it("shows administration only to administrators", () => {
    expect(accountNavigation(false)).not.toContain("Administration");
    expect(accountNavigation(true)).toContain("Administration");
  });
});
