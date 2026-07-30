import { devices } from "./catalog";
import type { Device, DeviceCategory } from "../types";

export type SearchFilters = {
  query?: string;
  category?: DeviceCategory | "all";
  brand?: string;
  maxPrice?: number;
  sort?: "popular" | "score" | "newest" | "price-low";
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.+]+/g, " ").replace(/\s+/g, " ").trim();
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isModelToken(token: string): boolean {
  // Short numbers / codes like "8", "12", "x9", "s24" should only match the
  // product name — never slug IDs (…-10916) or dense spec sheets (8GB, Wi‑Fi 6).
  return /^\d{1,4}[a-z]?$/i.test(token) || /^[a-z]\d{1,4}[a-z]?$/i.test(token) || token.length <= 2;
}

export function searchDevices(filters: SearchFilters): Device[] {
  const query = filters.query?.trim() ?? "";
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const result = devices.filter((device) => {
    if (filters.category && filters.category !== "all" && device.category !== filters.category) return false;
    if (filters.brand && filters.brand !== "all" && device.brand !== filters.brand) return false;
    if (typeof filters.maxPrice === "number" && (device.startingPrice === null || device.startingPrice > filters.maxPrice)) return false;
    if (!tokens.length) return true;

    const title = normalize([device.brand, device.model, device.category, device.summary, ...device.bestFor].join(" "));
    const titlePacked = compact(`${device.brand} ${device.model}`);
    const slugWords = normalize(`${device.slug} ${device.sourceSlug}`.replace(/-\d{3,5}$/g, "").replace(/_/g, " "));
    const specs = normalize(
      device.specifications.flatMap((group) => group.items.flatMap((item) => [item.label, item.value])).join(" "),
    );

    return tokens.every((token) => {
      if (title.includes(token) || titlePacked.includes(compact(token)) || slugWords.includes(token)) return true;
      if (fuzzyIncludes(title, token)) return true;
      if (isModelToken(token)) return false;
      return specs.includes(token) || compact(specs).includes(compact(token));
    });
  });

  return result.sort((a, b) => {
    if (filters.sort === "score") return b.score - a.score;
    if (filters.sort === "newest") return b.releaseDate.localeCompare(a.releaseDate);
    if (filters.sort === "price-low") return (a.startingPrice ?? Number.MAX_SAFE_INTEGER) - (b.startingPrice ?? Number.MAX_SAFE_INTEGER);
    return b.popularity - a.popularity;
  });
}

function fuzzyIncludes(haystack: string, needle: string) {
  if (needle.length < 4) return false;
  const packed = compact(haystack);
  const target = compact(needle);
  for (let index = 0; index < target.length; index += 1) {
    const candidate = target.slice(0, index) + target.slice(index + 1);
    if (candidate.length >= 3 && packed.includes(candidate)) return true;
  }
  return false;
}
