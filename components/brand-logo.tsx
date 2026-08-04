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
    <span className="inline-flex items-center gap-3" aria-label="DENTANOVA">
      {!failed && <span className={`${compact ? "h-12 w-12" : "h-14 w-14"} relative shrink-0 overflow-hidden rounded-full bg-white shadow-sm`}>
        <Image
          src="/branding/dentanova-logo.jpeg"
          alt="Logo DENTANOVA"
          width={compact ? 120 : 140}
          height={compact ? 120 : 140}
          className={`${compact ? "-left-[36px] -top-[16px] h-[120px] w-[120px]" : "-left-[42px] -top-[18px] h-[140px] w-[140px]"} absolute max-w-none`}
          onError={() => setFailed(true)}
          priority
        />
      </span>}
      <span className={inverted ? "text-white" : "text-slate-950"}>
        <b className="display block text-xl tracking-tight">DENTANOVA</b>
        <small className="block text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400">
          Matériel dentaire
        </small>
      </span>
    </span>
  );
}
