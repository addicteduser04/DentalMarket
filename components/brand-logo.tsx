"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center">
      {!failed && (
        <Image
          src="/branding/dentanova-logo.svg"
          alt="DENTANOVA"
          width={compact ? 145 : 185}
          height={compact ? 62 : 80}
          className={`${compact ? "h-[62px] w-[145px]" : "h-20 w-[185px]"} object-contain`}
          onError={() => setFailed(true)}
          priority
        />
      )}
      {failed && <b className="display text-xl tracking-tight text-white">DENTANOVA</b>}
    </span>
  );
}
