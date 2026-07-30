/**
 * Live GSMArena client.
 *
 * GSMArena itself is behind Cloudflare Turnstile, so we talk to a keyless
 * GSMArena-backed specs API (configurable via SPECS_API_URL). Brand pages
 * paginate with GSMArena's own URL scheme: `{brand}-phones-{id}` (page 1)
 * and `{brand}-phones-f-{id}-0-p{N}` (page 2+).
 */
import { serverEnvironment } from "../http/runtime-env";
import type { DeviceCategory } from "../types";
import type { RawSpecifications, SeedDevice } from "../seed/specs";

const DEFAULT_BASE = "https://mobile-specs-api-sandy.vercel.app";
const BRAND_PAGE_SIZE = 50;

export type GsmBrand = {
  name: string;
  brandId: number;
  brandSlug: string;
  deviceCount: number;
  detailUrl: string;
};

export type GsmListItem = {
  name: string;
  slug: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  brand: string;
  category: DeviceCategory;
};

export type GsmDetail = SeedDevice;

export class GsmArenaError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "GsmArenaError";
  }
}

type CacheEntry = { expires: number; value: unknown };
const memoryCache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | undefined {
  const hit = memoryCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs: number) {
  memoryCache.set(key, { value, expires: Date.now() + ttlMs });
  if (memoryCache.size > 500) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
}

function apiBase() {
  const configured = serverEnvironment("SPECS_API_URL") || DEFAULT_BASE;
  return configured.replace(/\/$/, "");
}

async function gsmRequest(path: string, signal?: AbortSignal, attempt = 1): Promise<unknown> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "CircuitMedia/2.0 (+https://circuit-media.com)",
      },
      signal,
    });
    if (!response.ok) throw new GsmArenaError(`GSMArena API returned ${response.status}`, response.status);
    const payload = await response.json() as { status?: boolean; message?: string; data?: unknown; count?: number };
    if (payload && payload.status === false) throw new GsmArenaError(payload.message || "GSMArena API error", 502);
    return payload;
  } catch (error) {
    if (error instanceof GsmArenaError) {
      if (attempt < 3 && error.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        return gsmRequest(path, signal, attempt + 1);
      }
      throw error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      return gsmRequest(path, signal, attempt + 1);
    }
    throw new GsmArenaError(error instanceof Error ? error.message : "GSMArena request failed", 502);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function detectCategory(name: string, slug = ""): DeviceCategory {
  const haystack = `${name} ${slug}`.toLowerCase();
  if (/\b(watch|band|fit\d|fit\b|fit2|loop)\b|smartwatch|_watch|_band|_fit/.test(haystack)) return "watch";
  if (/\bipad|matepad|\btab\b|_tab_|\bpad\b|_pad|tablet|pad_\d|pad\s/.test(haystack)) return "tablet";
  return "phone";
}

export function brandFromSlug(deviceSlug: string): string {
  const first = deviceSlug.split("_")[0] || "Unknown";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function brandPageSlug(brandSlug: string, page: number): string {
  // brandSlug is like "samsung-phones-9"
  if (page <= 1) return brandSlug;
  const match = brandSlug.match(/^(.*)-phones-(\d+)$/i);
  if (!match) return brandSlug;
  return `${match[1]}-phones-f-${match[2]}-0-p${page}`;
}

export async function listGsmBrands(signal?: AbortSignal): Promise<GsmBrand[]> {
  const cached = cacheGet<GsmBrand[]>("brands");
  if (cached) return cached;
  const payload = asRecord(await gsmRequest("/brands", signal));
  const raw = asRecord(payload.data);
  const brands = Object.entries(raw).map(([name, value]) => {
    const entry = asRecord(value);
    return {
      name,
      brandId: Number(entry.brand_id) || 0,
      brandSlug: asText(entry.brand_slug),
      deviceCount: Number(entry.device_count) || 0,
      detailUrl: asText(entry.detail_url) || `/brands/${asText(entry.brand_slug)}`,
    };
  }).filter((brand) => brand.brandSlug).sort((a, b) => a.name.localeCompare(b.name));
  cacheSet("brands", brands, 30 * 60_000);
  return brands;
}

function normalizeListItem(entry: unknown, brandHint = ""): GsmListItem | null {
  const raw = asRecord(entry);
  const slug = asText(raw.slug);
  if (!slug) return null;
  const name = asText(raw.name) || slug;
  const brand = brandHint || brandFromSlug(slug);
  return {
    name,
    slug,
    imageUrl: asText(raw.imageUrl) || asText(raw.image_url) || null,
    thumbUrl: asText(raw.thumbUrl) || asText(raw.thumb_url) || asText(raw.imageUrl) || null,
    brand,
    category: detectCategory(name, slug),
  };
}

export async function listGsmBrandDevices(
  brandSlug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<{ devices: GsmListItem[]; page: number; pageSize: number; hasNext: boolean }> {
  const cacheKey = `brand:${brandSlug}:${page}`;
  const cached = cacheGet<{ devices: GsmListItem[]; page: number; pageSize: number; hasNext: boolean }>(cacheKey);
  if (cached) return cached;

  const brands = await listGsmBrands(signal);
  const brand = brands.find((item) => item.brandSlug === brandSlug || item.name.toLowerCase() === brandSlug.toLowerCase());
  const resolvedSlug = brand?.brandSlug || brandSlug;
  const brandName = brand?.name || brandFromSlug(resolvedSlug);

  const pathSlug = brandPageSlug(resolvedSlug, page);
  const payload = asRecord(await gsmRequest(`/brands/${encodeURIComponent(pathSlug)}`, signal));
  const list = Array.isArray(payload.data) ? payload.data : [];
  const devices = list.map((entry) => normalizeListItem(entry, brandName)).filter((item): item is GsmListItem => Boolean(item));
  // GSMArena pages sometimes overlap by one item; still treat a full page as "has next".
  const result = { devices, page, pageSize: BRAND_PAGE_SIZE, hasNext: devices.length >= BRAND_PAGE_SIZE };
  cacheSet(cacheKey, result, 10 * 60_000);
  return result;
}

async function rawGsmSearch(query: string, signal?: AbortSignal): Promise<GsmListItem[]> {
  const payload = asRecord(await gsmRequest(`/search?query=${encodeURIComponent(query)}`, signal));
  const list = Array.isArray(payload.data) ? payload.data : [];
  return list.map((entry) => normalizeListItem(entry)).filter((item): item is GsmListItem => Boolean(item));
}

function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9.+]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 1 && !["the", "a", "an", "and", "or", "with", "for"].includes(token));
}

function matchesAllTokens(item: GsmListItem, tokens: string[]): boolean {
  if (!tokens.length) return true;
  // Compare against the human-readable name/brand only so numeric model tokens
  // (12, 8, x9) do not accidentally match GSMArena numeric IDs in the slug.
  const haystack = `${item.brand} ${item.name}`.toLowerCase().replace(/[^a-z0-9.+]+/g, " ");
  const compact = haystack.replace(/\s+/g, "");
  return tokens.every((token) => haystack.includes(token) || compact.includes(token.replace(/\s+/g, "")));
}

function dedupeGsmItems(items: GsmListItem[]): GsmListItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

const BRAND_ALIASES: Record<string, string> = {
  galaxy: "samsung",
  pixel: "google",
  iphone: "apple",
  ipad: "apple",
  rog: "asus",
  zenfone: "asus",
  find: "oppo",
  reno: "oppo",
  redmi: "xiaomi",
  poco: "xiaomi",
  mi: "xiaomi",
  moto: "motorola",
  iqoo: "vivo",
};

async function matchBrandInQuery(query: string, signal?: AbortSignal): Promise<{ brand: GsmBrand; remainder: string } | null> {
  const brands = await listGsmBrands(signal);
  const lower = query.toLowerCase().trim();
  const ranked = brands
    .map((brand) => ({ brand, name: brand.name.toLowerCase() }))
    .filter(({ name }) => lower === name || lower.startsWith(`${name} `) || lower.includes(` ${name} `) || lower.endsWith(` ${name}`))
    .sort((a, b) => b.name.length - a.name.length);
  if (ranked.length) {
    const { brand, name } = ranked[0];
    const remainder = lower.replace(name, " ").replace(/\s+/g, " ").trim();
    return { brand, remainder };
  }

  const toks = searchTokens(query);
  // Product-line aliases: "find x9" → Oppo, "rog phone 8" → Asus, "galaxy s24" → Samsung.
  for (const token of toks) {
    const alias = BRAND_ALIASES[token];
    if (!alias) continue;
    const brand = brands.find((item) =>
      item.name.toLowerCase() === alias ||
      item.brandSlug.toLowerCase().startsWith(`${alias}-phones-`)
    );
    if (!brand) continue;
    const remainder = toks.filter((item) => item !== token && BRAND_ALIASES[item] !== alias).join(" ");
    return { brand, remainder };
  }

  const first = toks[0];
  if (!first || first.length < 2) return null;
  const brand = brands.find((item) =>
    item.name.toLowerCase() === first ||
    item.brandSlug.toLowerCase().startsWith(`${first}-phones-`) ||
    item.name.toLowerCase().replace(/\s+/g, "") === first
  );
  if (!brand) return null;
  const remainder = query.replace(new RegExp(first, "i"), " ").replace(/\s+/g, " ").trim();
  return { brand, remainder };
}

async function searchBrandCatalog(brand: GsmBrand, remainder: string, signal?: AbortSignal, maxPages = 3): Promise<GsmListItem[]> {
  const tokens = searchTokens(remainder);
  const collected: GsmListItem[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listGsmBrandDevices(brand.brandSlug, page, signal);
    const matched = tokens.length ? result.devices.filter((item) => matchesAllTokens(item, tokens)) : result.devices;
    collected.push(...matched);
    if (!result.hasNext) break;
    // Brand-only queries: one page is enough for a useful result set.
    if (!tokens.length) break;
    // Model filters: stop early once we have a solid hit list.
    if (tokens.length && collected.length >= 24) break;
  }
  return collected;
}

/**
 * Live catalog search with fallbacks.
 * The upstream `/search` endpoint often returns empty for valid brand-only
 * queries (Oppo, Asus, Google, Honor…) and some brand+model pairs (OnePlus 12).
 * We recover by token search + brand-page filtering.
 */
export async function searchGsmDevices(query: string, signal?: AbortSignal): Promise<GsmListItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const cacheKey = `search:${trimmed.toLowerCase()}`;
  const cached = cacheGet<GsmListItem[]>(cacheKey);
  if (cached) return cached;

  const tokens = searchTokens(trimmed);
  let devices = await rawGsmSearch(trimmed, signal);

  // Multi-word miss: search the first token and keep rows that match every token.
  if (devices.length === 0 && tokens.length > 1) {
    const headHits = await rawGsmSearch(tokens[0], signal);
    devices = headHits.filter((item) => matchesAllTokens(item, tokens));
  }

  // Brand-aware recovery for empty / brand-only failures (Oppo, Asus, Google…).
  if (devices.length === 0) {
    const matched = await matchBrandInQuery(trimmed, signal);
    if (matched) {
      devices = await searchBrandCatalog(matched.brand, matched.remainder, signal);
    }
  }

  devices = dedupeGsmItems(devices);
  cacheSet(cacheKey, devices, 5 * 60_000);
  return devices;
}

export async function topGsmByInterest(signal?: AbortSignal): Promise<GsmListItem[]> {
  const cached = cacheGet<GsmListItem[]>("top-interest");
  if (cached) return cached;
  const payload = asRecord(await gsmRequest("/top-by-interest", signal));
  const list = Array.isArray(payload.data) ? payload.data : [];
  const devices = list.map((entry) => normalizeListItem(entry)).filter((item): item is GsmListItem => Boolean(item));
  cacheSet("top-interest", devices, 10 * 60_000);
  return devices;
}

export async function topGsmByFans(signal?: AbortSignal): Promise<GsmListItem[]> {
  const cached = cacheGet<GsmListItem[]>("top-fans");
  if (cached) return cached;
  const payload = asRecord(await gsmRequest("/top-by-fans", signal));
  const list = Array.isArray(payload.data) ? payload.data : [];
  const devices = list.map((entry) => normalizeListItem(entry)).filter((item): item is GsmListItem => Boolean(item));
  cacheSet("top-fans", devices, 10 * 60_000);
  return devices;
}

export function normalizeGsmDetail(slug: string, brandName: string, listHint: GsmListItem | null, detail: unknown): SeedDevice {
  const raw = asRecord(detail);
  const data = asRecord(raw.data?.constructor === Object ? raw.data : Object.keys(raw).includes("specifications") ? raw : raw.data);
  const source = Object.keys(data).length ? data : raw;
  const name = asText(source.model) || asText(source.name) || listHint?.name || slug;
  const brand = brandName || asText(source.brand) || brandFromSlug(slug);
  const fullName = name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
  const images = Array.isArray(source.device_images)
    ? (source.device_images as unknown[]).flatMap((entry) => {
      if (typeof entry === "string") return entry ? [{ color: "Default", url: entry }] : [];
      const item = asRecord(entry);
      const url = asText(item.url) || asText(item.image_url);
      return url ? [{ color: asText(item.color) || "Default", url }] : [];
    })
    : [];
  return {
    slug,
    brand,
    name: fullName,
    category: detectCategory(fullName, slug),
    imageUrl: asText(source.imageUrl) || asText(source.image_url) || listHint?.imageUrl || images[0]?.url || null,
    thumbUrl: listHint?.thumbUrl || asText(source.imageUrl) || null,
    deviceImages: images,
    reviewUrl: asText(source.review_url) || null,
    releaseDate: asText(source.release_date) || "",
    dimensions: asText(source.dimensions) || "",
    os: asText(source.os) || "",
    storage: asText(source.storage) || "",
    specifications: (asRecord(source.specifications) as RawSpecifications) || {},
    sourceUrl: `https://www.gsmarena.com/${slug}.php`,
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

export async function getGsmDevice(slug: string, signal?: AbortSignal): Promise<SeedDevice> {
  const normalized = slug.trim();
  if (!normalized) throw new GsmArenaError("Missing device slug", 400);
  const cacheKey = `detail:${normalized}`;
  const cached = cacheGet<SeedDevice>(cacheKey);
  if (cached) return cached;
  const payload = await gsmRequest(`/${encodeURIComponent(normalized)}`, signal);
  const seed = normalizeGsmDetail(normalized, brandFromSlug(normalized), null, payload);
  if (!seed.specifications || Object.keys(seed.specifications).length < 1) {
    throw new GsmArenaError(`No specifications returned for ${normalized}`, 404);
  }
  cacheSet(cacheKey, seed, 60 * 60_000);
  return seed;
}

export async function findGsmBrand(nameOrSlug: string, signal?: AbortSignal): Promise<GsmBrand | undefined> {
  const brands = await listGsmBrands(signal);
  const needle = nameOrSlug.trim().toLowerCase();
  return brands.find((brand) =>
    brand.name.toLowerCase() === needle ||
    brand.brandSlug.toLowerCase() === needle ||
    brand.brandSlug.toLowerCase().startsWith(`${needle}-phones-`)
  );
}

export function totalGsmDeviceCount(brands: GsmBrand[]): number {
  return brands.reduce((sum, brand) => sum + brand.deviceCount, 0);
}

export { BRAND_PAGE_SIZE };
