"use client";

import { useState } from "react";
import type { DeviceCategory } from "../../lib/types";
import { DeviceVisual } from "./DeviceVisual";

export function DevicePhoto({
  src,
  alt,
  category,
  accent,
  className = "catalog-photo",
}: {
  src: string | null | undefined;
  alt: string;
  category: DeviceCategory;
  accent: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <DeviceVisual category={category} accent={accent} label={alt} />;
  // Real product photos are hotlinked from the catalog source (GSMArena CDN).
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
