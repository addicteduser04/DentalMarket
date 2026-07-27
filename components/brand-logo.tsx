"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandLogo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center gap-3">
      {!failed && (
        <Image
          src="/branding/dentalnova-logo.jpeg"
          alt="DENTALNOVA"
          width={compact ? 44 : 56}
          height={compact ? 44 : 56}
          className={`${compact ? "h-11 w-11" : "h-14 w-14"} rounded-full object-contain`}
          onError={() => setFailed(true)}
          priority
        />
      )}
      <span className={inverted ? "text-white" : "text-ink"}>
        <b className="display block text-xl tracking-tight">DENTALNOVA</b>
        <small className={`block text-[9px] font-bold uppercase tracking-[.2em] ${inverted ? "text-mint" : "text-sage"}`}>
          Casablanca
        </small>
      </span>
    </span>
  );
}
