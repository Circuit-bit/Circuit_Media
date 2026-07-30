/**
 * The device catalog: converts the seeded GSMArena dataset (lib/data/devices.json)
 * into the app's Device shape, computing component scores, pros/cons, and
 * summaries from parsed specifications.
 */
import dataset from "./data/devices.json";
import { cleanHtml, extractFeatures, type DeviceFeatures, type SeedDevice } from "./specs";
import type { ComponentScores, Device, DeviceCategory, SpecificationGroup } from "../types";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function toIsoDate(text: string, fallbackYear: number | null): string {
  const match = text.match(/(20[0-3][0-9]),?\s+([A-Za-z]+)(?:\s+(\d{1,2}))?/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()] ?? "01";
    const day = match[3] ? match[3].padStart(2, "0") : "01";
    return `${match[1]}-${month}-${day}`;
  }
  return fallbackYear ? `${fallbackYear}-01-01` : "2000-01-01";
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const scale = (value: number | null, min: number, max: number) =>
  value === null ? 0.35 : clamp01((value - min) / (max - min));

function computeScores(features: DeviceFeatures, category: DeviceCategory): ComponentScores {
  const performance = 0.75 * (features.chipsetScore / 100) + 0.25 * scale(features.maxRamGb, 2, 16);
  const display =
    (features.isOled ? 0.35 : 0.1) +
    0.3 * scale(features.refreshHz, 60, 144) +
    0.2 * scale(features.ppi, 220, 550) +
    0.15 * scale(features.brightnessNits, 400, 3000);
  const mpLog = features.mainCameraMp ? Math.log(features.mainCameraMp) : null;
  const camera =
    0.35 * scale(mpLog, Math.log(5), Math.log(200)) +
    0.2 * clamp01(features.lensCount / 4) +
    (features.hasOis ? 0.15 : 0) +
    (features.hasTelephoto ? 0.15 : 0) +
    (features.maxVideo === "8K" ? 0.15 : features.maxVideo === "4K" ? 0.1 : 0);
  const batteryRange: [number, number] = category === "tablet" ? [5000, 12000] : category === "watch" ? [200, 700] : [3000, 6500];
  const battery =
    0.6 * scale(features.batteryMah, batteryRange[0], batteryRange[1]) +
    0.3 * scale(features.chargeWatts, 5, 120) +
    (features.wirelessCharging ? 0.1 : 0);
  const build =
    (features.waterResistant ? 0.45 : features.ipRating ? 0.25 : 0) +
    (features.premiumBuild ? 0.3 : 0.12) +
    (features.hasNfc || category !== "phone" ? 0.15 : 0.05) +
    0.1;
  const toTen = (value: number) => Math.round(clamp01(value) * 100) / 10;
  return {
    performance: toTen(performance),
    display: toTen(display),
    camera: toTen(camera),
    battery: toTen(battery),
    build: toTen(build),
  };
}

const WEIGHTS: Record<DeviceCategory, ComponentScores> = {
  phone: { performance: 0.25, display: 0.2, camera: 0.25, battery: 0.2, build: 0.1 },
  tablet: { performance: 0.3, display: 0.3, camera: 0.1, battery: 0.2, build: 0.1 },
  watch: { performance: 0.15, display: 0.25, camera: 0, battery: 0.35, build: 0.25 },
};

function overallScore(scores: ComponentScores, category: DeviceCategory): number {
  const weights = WEIGHTS[category];
  const raw =
    scores.performance * weights.performance +
    scores.display * weights.display +
    scores.camera * weights.camera +
    scores.battery * weights.battery +
    scores.build * weights.build;
  // Map the practical 1.5–8.5 weighted range onto a 4.0–9.8 editorial scale.
  return Math.round(Math.max(4, Math.min(9.8, 4 + (raw - 1.5) * 0.83)) * 10) / 10;
}

const BRAND_WEIGHT: Record<string, number> = {
  Apple: 16, Samsung: 15, Google: 11, Xiaomi: 11, OnePlus: 9, Oppo: 7, vivo: 7,
  Realme: 6, Motorola: 6, Nothing: 8, Honor: 6, Huawei: 7, Sony: 5, Asus: 5,
};

function computePopularity(features: DeviceFeatures, brand: string): number {
  const currentYear = new Date().getFullYear();
  const age = features.releaseYear ? Math.max(0, currentYear - features.releaseYear) : 6;
  return Math.max(1, Math.min(100, Math.round(
    38 + (BRAND_WEIGHT[brand] ?? 4) + Math.max(0, 28 - age * 7) + (features.chipsetScore / 100) * 18
  )));
}

function buildProsCons(features: DeviceFeatures, category: DeviceCategory) {
  const pros: string[] = [];
  const cons: string[] = [];
  if (features.chipsetScore >= 88) pros.push("Flagship-class performance");
  if (features.batteryMah && category === "phone" && features.batteryMah >= 5500) pros.push(`Large ${features.batteryMah.toLocaleString()} mAh battery`);
  if (features.chargeWatts && features.chargeWatts >= 80) pros.push(`Very fast ${features.chargeWatts}W charging`);
  if (features.isOled && features.refreshHz && features.refreshHz >= 120) pros.push(`Smooth ${features.refreshHz}Hz OLED display`);
  if (features.hasPeriscope) pros.push("Periscope telephoto zoom");
  else if (features.hasTelephoto) pros.push("Dedicated telephoto camera");
  if (features.hasOis && !features.hasPeriscope) pros.push("Optically stabilized main camera");
  if (features.waterResistant) pros.push(`${features.ipRating} water resistance`);
  if (features.premiumBuild) pros.push("Premium build materials");
  if (features.cardSlot) pros.push("Expandable storage");
  if (features.hasJack) pros.push("3.5mm headphone jack");
  if (features.stylusSupport && category !== "watch") pros.push("Stylus support");

  if (category !== "watch" && !features.isOled && features.displayPanel === "LCD") cons.push("LCD rather than OLED display");
  if (features.refreshHz === 60 && category === "phone") cons.push("60Hz display refresh rate");
  if (features.chargeWatts !== null && features.chargeWatts <= 25 && category === "phone") cons.push("Modest charging speed");
  if (!features.waterResistant && category === "phone" && !features.ipRating) cons.push("No official water-resistance rating");
  if (features.batteryMah !== null && category === "phone" && features.batteryMah < 4200) cons.push("Smaller battery than rivals");
  if (!features.hasNfc && category === "phone") cons.push("No NFC for contactless payments");
  if (features.weightGrams !== null && category === "phone" && features.weightGrams >= 225) cons.push(`Heavy at ${features.weightGrams}g`);
  if (features.chipsetScore < 50) cons.push("Entry-level performance");
  if (features.priceUsd === null) cons.push("Pricing varies by region");
  return { pros: pros.slice(0, 5), cons: cons.slice(0, 4) };
}

function buildBestFor(features: DeviceFeatures, category: DeviceCategory): string[] {
  const tags: string[] = [];
  if (category === "watch") {
    if (features.hasGps) tags.push("Fitness tracking");
    if (features.batteryMah && features.batteryMah >= 450) tags.push("Battery life");
    tags.push("Health sensors");
  } else {
    if (features.chipsetScore >= 85 && (features.refreshHz ?? 0) >= 120) tags.push("Gaming");
    if ((features.mainCameraMp ?? 0) >= 50 && (features.hasTelephoto || features.hasOis)) tags.push("Photography");
    if ((features.batteryMah ?? 0) >= (category === "tablet" ? 8000 : 5500)) tags.push("Battery life");
    if (features.priceUsd !== null && features.priceUsd < 400) tags.push("Value");
    if (category === "phone" && (features.displayInches ?? 7) <= 6.2) tags.push("One-hand use");
    if (category === "tablet" && features.stylusSupport) tags.push("Creative work");
    if (features.maxVideo === "8K" || (features.maxVideo === "4K" && features.hasOis)) tags.push("Video");
  }
  if (!tags.length) tags.push("Everyday use");
  return tags.slice(0, 3);
}

function tierAdjective(features: DeviceFeatures): string {
  if (features.chipsetScore >= 88) return "flagship";
  if (features.chipsetScore >= 70) return "upper mid-range";
  if (features.chipsetScore >= 50) return "mid-range";
  return "budget";
}

function buildSummary(name: string, category: DeviceCategory, features: DeviceFeatures): string {
  const parts: string[] = [];
  if (features.displayInches) parts.push(`a ${features.displayInches}″ ${features.isOled ? "OLED" : features.displayPanel}${features.refreshHz && features.refreshHz > 60 ? ` ${features.refreshHz}Hz` : ""} display`);
  if (features.chipset) parts.push(`the ${cleanHtml(features.chipset).split("(")[0].trim()}`);
  if (features.mainCameraMp && category !== "watch") parts.push(`a ${features.mainCameraMp}MP ${features.lensCount > 1 ? `${features.lensCount}-camera` : "camera"} system`);
  if (features.batteryMah) parts.push(`a ${features.batteryMah.toLocaleString()} mAh battery${features.chargeWatts ? ` with ${features.chargeWatts}W charging` : ""}`);
  const year = features.releaseYear ? ` (${features.releaseYear})` : "";
  const categoryLabel = category === "phone" ? "smartphone" : category;
  return `${name} is a ${tierAdjective(features)} ${categoryLabel}${year} pairing ${parts.slice(0, 3).join(", ")}.`;
}

const ACCENTS = ["#c8b5a3", "#9aaeb5", "#d9c2b8", "#30556a", "#dedbd3", "#e8e5dc", "#23262f", "#7c7d82", "#b6aa8e", "#a3b5c8", "#c4a3c8", "#8ea98e"];
function accentFor(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function toSpecGroups(seed: SeedDevice): SpecificationGroup[] {
  return Object.entries(seed.specifications).flatMap(([groupName, entries]) => {
    const items = Object.entries(entries ?? {}).flatMap(([label, value]) => {
      const text = cleanHtml(value);
      return text ? [{ label: label || "Info", value: text, status: "verified" as const, sourceId: "catalog" }] : [];
    });
    return items.length ? [{ name: groupName, items }] : [];
  });
}

function cleanSlug(seedSlug: string): string {
  return seedSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Convert a GSMArena seed/detail record into the app Device shape. */
export function toDevice(seed: SeedDevice): Device {
  const features = extractFeatures(seed);
  const componentScores = computeScores(features, seed.category);
  const { pros, cons } = buildProsCons(features, seed.category);
  const releaseDate = toIsoDate(seed.releaseDate || features.status, features.releaseYear);
  const routeSlug = cleanSlug(seed.slug);
  return {
    id: routeSlug,
    slug: routeSlug,
    sourceSlug: seed.slug,
    brand: seed.brand,
    model: seed.name.toLowerCase().startsWith(seed.brand.toLowerCase())
      ? seed.name.slice(seed.brand.length).trim() || seed.name
      : seed.name,
    modelNumber: features.models || "Not published",
    category: seed.category,
    announcementDate: toIsoDate(features.announced, features.releaseYear),
    releaseDate,
    availability: features.status || "See source",
    startingPrice: features.priceUsd,
    currency: "USD",
    colors: features.colors,
    variants: features.variants,
    officialUrl: `/api/devices/${routeSlug}`,
    lastUpdated: seed.fetchedAt,
    verification: "verified",
    score: overallScore(componentScores, seed.category),
    popularity: computePopularity(features, seed.brand),
    summary: buildSummary(seed.name, seed.category, features),
    bestFor: buildBestFor(features, seed.category),
    pros,
    cons,
    specifications: toSpecGroups(seed),
    sources: [{
      id: "catalog",
      provider: "Circuit Media catalog",
      url: `/api/devices/${routeSlug}`,
      verifiedAt: seed.fetchedAt,
      license: "Catalog record",
    }],
    accent: accentFor(seed.brand + seed.slug),
    image: {
      url: seed.imageUrl,
      sourceUrl: `/api/devices/${routeSlug}`,
      provider: "Circuit Media",
      license: "Catalog media",
      verifiedAt: seed.fetchedAt,
    },
    photos: seed.deviceImages,
    componentScores,
    reviewUrl: null,
  };
}

/** Lightweight card from a GSMArena list/search hit (full specs loaded on demand). */
export function listItemToDevice(item: {
  name: string;
  slug: string;
  imageUrl: string | null;
  thumbUrl?: string | null;
  brand: string;
  category: DeviceCategory;
}, popularity = 50): Device {
  const routeSlug = cleanSlug(item.slug);
  const model = item.name.toLowerCase().startsWith(item.brand.toLowerCase())
    ? item.name.slice(item.brand.length).trim() || item.name
    : item.name;
  return {
    id: routeSlug,
    slug: routeSlug,
    sourceSlug: item.slug,
    brand: item.brand,
    model,
    modelNumber: "See full specifications",
    category: item.category,
    announcementDate: "2000-01-01",
    releaseDate: "2000-01-01",
    availability: "See source",
    startingPrice: null,
    currency: "USD",
    colors: [],
    variants: [],
    officialUrl: `/api/devices/${routeSlug}`,
    lastUpdated: new Date().toISOString().slice(0, 10),
    verification: "unverified",
    score: 0,
    popularity,
    summary: `${item.brand} ${model} — open for full live specifications and photos.`,
    bestFor: [],
    pros: [],
    cons: [],
    specifications: [],
    sources: [{
      id: "catalog",
      provider: "Circuit Media catalog",
      url: `/api/devices/${routeSlug}`,
      verifiedAt: new Date().toISOString().slice(0, 10),
      license: "Catalog record",
    }],
    accent: accentFor(item.brand + item.slug),
    image: {
      url: item.imageUrl || item.thumbUrl || null,
      sourceUrl: `/api/devices/${routeSlug}`,
      provider: "Circuit Media",
      license: "Catalog media",
      verifiedAt: new Date().toISOString().slice(0, 10),
    },
    photos: item.imageUrl ? [{ color: "Default", url: item.imageUrl }] : [],
    componentScores: undefined,
    reviewUrl: null,
  };
}

const seeds = (dataset as unknown as { devices: SeedDevice[] }).devices.filter(
  (seed) => seed.specifications && Object.keys(seed.specifications).length >= 3,
);

const featureMap = new Map<string, DeviceFeatures>();
const sourceSlugIndex = new Map<string, Device>();

export const devices: Device[] = seeds
  .map((seed) => {
    const device = toDevice(seed);
    featureMap.set(device.id, extractFeatures(seed));
    sourceSlugIndex.set(seed.slug, device);
    return device;
  })
  .sort((a, b) => b.popularity - a.popularity || b.score - a.score);

export const datasetInfo = {
  generatedAt: (dataset as unknown as { generatedAt: string }).generatedAt,
  source: (dataset as unknown as { source: string }).source,
  count: devices.length,
};

export function featuresOf(device: Device): DeviceFeatures | undefined {
  return featureMap.get(device.id);
}

export function getDevice(slugOrId: string): Device | undefined {
  const needle = slugOrId.trim();
  return devices.find((device) => device.slug === needle || device.id === needle || device.sourceSlug === needle)
    ?? sourceSlugIndex.get(needle);
}

/** Map a URL-friendly slug back toward a GSMArena source slug when possible. */
export function guessSourceSlug(slugOrId: string): string {
  const local = getDevice(slugOrId);
  if (local?.sourceSlug) return local.sourceSlug;
  const trimmed = slugOrId.trim();
  if (trimmed.includes("_") || /-\d{3,5}$/.test(trimmed)) return trimmed;
  // apple-iphone-16-13317 → apple_iphone_16-13317
  const match = trimmed.match(/^(.*)-(\d{3,5})$/);
  if (match) return `${match[1].replace(/-/g, "_")}-${match[2]}`;
  return trimmed.replace(/-/g, "_");
}

export function getByCategory(category: DeviceCategory): Device[] {
  return devices.filter((device) => device.category === category);
}

export const brands = [...new Set(devices.map((device) => device.brand))].sort();

export const categories: { key: DeviceCategory; label: string; href: string }[] = [
  { key: "phone", label: "Smartphones", href: "/phones" },
  { key: "tablet", label: "Tablets", href: "/tablets" },
  { key: "watch", label: "Smartwatches", href: "/watches" },
];

export const categoryCounts = {
  phone: devices.filter((device) => device.category === "phone").length,
  tablet: devices.filter((device) => device.category === "tablet").length,
  watch: devices.filter((device) => device.category === "watch").length,
};

export function rememberFeatures(device: Device, seed: SeedDevice) {
  featureMap.set(device.id, extractFeatures(seed));
}
