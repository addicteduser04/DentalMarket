import { createHash } from "node:crypto";

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

export function hashFingerprint(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}
