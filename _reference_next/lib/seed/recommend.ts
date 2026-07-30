/**
 * Use-case driven recommendation engine. Deterministic and explainable:
 * every ranked result carries the criteria weights and concrete spec facts
 * that produced its score.
 */
import { devices, featuresOf } from "./catalog";
import type { DeviceFeatures } from "./specs";
import type { Device, DeviceCategory } from "../types";

export type CriterionId =
  | "performance" | "display" | "camera" | "zoom" | "battery" | "charging"
  | "portability" | "durability" | "value" | "recency" | "fitness" | "productivity";

export type Scenario = {
  id: string;
  label: string;
  description: string;
  categories: DeviceCategory[];
  weights: Partial<Record<CriterionId, number>>;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "everyday",
    label: "Everyday all-rounder",
    description: "Balanced performance, battery, and camera for daily life.",
    categories: ["phone", "tablet"],
    weights: { performance: 0.2, display: 0.15, camera: 0.2, battery: 0.2, value: 0.15, recency: 0.1 },
  },
  {
    id: "gaming",
    label: "Mobile gaming",
    description: "Sustained performance, high refresh-rate display, and battery to match.",
    categories: ["phone", "tablet"],
    weights: { performance: 0.4, display: 0.25, battery: 0.15, charging: 0.1, recency: 0.1 },
  },
  {
    id: "photography",
    label: "Photography",
    description: "Camera hardware first: sensors, stabilization, and optical zoom.",
    categories: ["phone"],
    weights: { camera: 0.4, zoom: 0.15, display: 0.15, performance: 0.15, battery: 0.1, recency: 0.05 },
  },
  {
    id: "video",
    label: "Video & content creation",
    description: "High-resolution stabilized video with the power to edit on device.",
    categories: ["phone", "tablet"],
    weights: { camera: 0.3, performance: 0.25, display: 0.2, battery: 0.15, recency: 0.1 },
  },
  {
    id: "battery",
    label: "Marathon battery",
    description: "Days of use and fast top-ups, everything else second.",
    categories: ["phone", "tablet", "watch"],
    weights: { battery: 0.5, charging: 0.2, performance: 0.1, display: 0.1, value: 0.1 },
  },
  {
    id: "value",
    label: "Best value on a budget",
    description: "The most capability per dollar.",
    categories: ["phone", "tablet", "watch"],
    weights: { value: 0.45, battery: 0.15, performance: 0.15, display: 0.1, camera: 0.1, recency: 0.05 },
  },
  {
    id: "compact",
    label: "Compact & light",
    description: "Easy one-hand use without giving up too much.",
    categories: ["phone"],
    weights: { portability: 0.4, display: 0.15, camera: 0.15, performance: 0.15, battery: 0.15 },
  },
  {
    id: "business",
    label: "Business & productivity",
    description: "Reliability, security features, endurance, and multitasking.",
    categories: ["phone", "tablet"],
    weights: { performance: 0.25, battery: 0.2, productivity: 0.2, durability: 0.15, display: 0.1, recency: 0.1 },
  },
  {
    id: "media",
    label: "Media & streaming",
    description: "The best screen and speakers for movies and reading.",
    categories: ["phone", "tablet"],
    weights: { display: 0.4, battery: 0.25, portability: 0.1, value: 0.15, performance: 0.1 },
  },
  {
    id: "fitness",
    label: "Fitness & outdoors",
    description: "GPS, health sensors, water resistance, and multi-day endurance.",
    categories: ["watch"],
    weights: { fitness: 0.35, battery: 0.3, durability: 0.25, display: 0.1 },
  },
  {
    id: "rugged",
    label: "Durability first",
    description: "Water resistance and a build that survives drops and job sites.",
    categories: ["phone", "watch"],
    weights: { durability: 0.4, battery: 0.25, value: 0.15, performance: 0.1, display: 0.1 },
  },
];

export type MustHaveId = "5g" | "nfc" | "jack" | "water" | "wireless" | "sdcard" | "telephoto" | "esim";

export const MUST_HAVES: Array<{ id: MustHaveId; label: string; categories: DeviceCategory[] }> = [
  { id: "5g", label: "5G", categories: ["phone", "tablet"] },
  { id: "nfc", label: "NFC payments", categories: ["phone", "watch"] },
  { id: "water", label: "Water resistant", categories: ["phone", "tablet", "watch"] },
  { id: "wireless", label: "Wireless charging", categories: ["phone", "watch"] },
  { id: "telephoto", label: "Telephoto zoom", categories: ["phone"] },
  { id: "sdcard", label: "Expandable storage", categories: ["phone", "tablet"] },
  { id: "jack", label: "Headphone jack", categories: ["phone", "tablet"] },
  { id: "esim", label: "eSIM", categories: ["phone", "watch"] },
];

function passesMustHave(features: DeviceFeatures, mustHave: MustHaveId): boolean {
  switch (mustHave) {
    case "5g": return features.has5g;
    case "nfc": return features.hasNfc;
    case "jack": return features.hasJack;
    case "water": return features.waterResistant;
    case "wireless": return features.wirelessCharging;
    case "sdcard": return features.cardSlot;
    case "telephoto": return features.hasTelephoto;
    case "esim": return features.hasEsim;
  }
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const scale = (value: number | null, min: number, max: number, missing = 0.3) =>
  value === null ? missing : clamp01((value - min) / (max - min));

/** All criterion values normalized to 0..1. */
function criterionValues(device: Device, features: DeviceFeatures): Record<CriterionId, number> {
  const scores = device.componentScores ?? { performance: 4, display: 4, camera: 4, battery: 4, build: 4 };
  const currentYear = new Date().getFullYear();
  const isWatch = device.category === "watch";
  const value = device.startingPrice
    ? clamp01((device.score / Math.max(120, device.startingPrice)) / 0.02)
    : 0.25;
  return {
    performance: scores.performance / 10,
    display: scores.display / 10,
    camera: scores.camera / 10,
    zoom: features.hasPeriscope ? 1 : features.hasTelephoto ? 0.7 : 0.1,
    battery: scores.battery / 10,
    charging: scale(features.chargeWatts, 10, 120),
    portability: isWatch ? 0.7 : clamp01(1 - scale(features.weightGrams, 150, 260, 0.5)) * 0.6 + clamp01(1 - scale(features.displayInches, 5.8, 7, 0.5)) * 0.4,
    durability: (features.waterResistant ? 0.5 : features.ipRating ? 0.3 : 0) + (features.premiumBuild ? 0.3 : 0.1) + 0.15,
    value,
    recency: features.releaseYear ? clamp01(1 - (currentYear - features.releaseYear) / 4) : 0.2,
    fitness: (features.hasGps ? 0.45 : 0) + (features.sensors ? Math.min(0.35, features.sensors.split(",").length * 0.07) : 0) + (features.waterResistant ? 0.2 : 0),
    productivity: (features.stylusSupport ? 0.3 : 0) + (features.hasEsim ? 0.15 : 0) + (features.hasNfc ? 0.15 : 0) + scale(features.maxRamGb, 4, 16) * 0.4,
  };
}

function fact(criterion: CriterionId, device: Device, features: DeviceFeatures): string | null {
  switch (criterion) {
    case "performance":
      return features.chipset ? `${features.chipset.split("(")[0].trim()}${features.maxRamGb ? ` with up to ${features.maxRamGb}GB RAM` : ""}` : null;
    case "display":
      return features.displayInches ? `${features.displayInches}″ ${features.isOled ? "OLED" : features.displayPanel}${features.refreshHz && features.refreshHz > 60 ? ` at ${features.refreshHz}Hz` : ""}${features.brightnessNits ? `, ${features.brightnessNits} nits peak` : ""}` : null;
    case "camera":
      return features.mainCameraMp ? `${features.mainCameraMp}MP ${features.lensCount > 1 ? `${features.lensCount}-lens ` : ""}camera${features.hasOis ? " with OIS" : ""}${features.maxVideo ? `, ${features.maxVideo} video` : ""}` : null;
    case "zoom":
      return features.hasPeriscope ? "Periscope telephoto for long-range zoom" : features.hasTelephoto ? "Dedicated telephoto lens" : null;
    case "battery":
      return features.batteryMah ? `${features.batteryMah.toLocaleString()} mAh battery` : null;
    case "charging":
      return features.chargeWatts ? `${features.chargeWatts}W charging${features.wirelessCharging ? " plus wireless" : ""}` : null;
    case "portability":
      return features.weightGrams ? `${features.weightGrams}g${features.thicknessMm ? `, ${features.thicknessMm}mm thin` : ""}` : null;
    case "durability":
      return features.ipRating ? `${features.ipRating} rated${features.premiumBuild ? ", premium materials" : ""}` : features.premiumBuild ? "Premium build materials" : null;
    case "value":
      return device.startingPrice ? `Scores ${device.score.toFixed(1)}/10 at $${device.startingPrice.toLocaleString()}` : null;
    case "recency":
      return features.releaseYear ? `Released ${features.releaseYear}` : null;
    case "fitness":
      return features.hasGps ? `Built-in GPS${features.waterResistant ? ` and ${features.ipRating}` : ""}` : null;
    case "productivity":
      return features.stylusSupport ? "Stylus support for notes and markup" : features.maxRamGb ? `${features.maxRamGb}GB RAM for multitasking` : null;
  }
}

export type RecommendationQuery = {
  scenario: string;
  category?: DeviceCategory | "all";
  budgetMax?: number | null;
  brands?: string[];
  mustHave?: MustHaveId[];
  includeOlder?: boolean;
  limit?: number;
};

export type Recommendation = {
  device: Device;
  score: number;
  reasons: string[];
  breakdown: Array<{ criterion: CriterionId; weight: number; score: number }>;
};

export type RecommendationResult = {
  scenario: Scenario;
  total: number;
  considered: number;
  recommendations: Recommendation[];
};

export function recommend(query: RecommendationQuery): RecommendationResult {
  const scenario = SCENARIOS.find((candidate) => candidate.id === query.scenario) ?? SCENARIOS[0];
  const limit = Math.min(Math.max(query.limit ?? 8, 1), 24);
  const currentYear = new Date().getFullYear();
  const wantedBrands = (query.brands ?? []).map((brand) => brand.toLowerCase()).filter(Boolean);

  const pool = devices.filter((device) => {
    if (query.category && query.category !== "all" && device.category !== query.category) return false;
    if (!query.category || query.category === "all") {
      if (!scenario.categories.includes(device.category)) return false;
    }
    if (wantedBrands.length && !wantedBrands.includes(device.brand.toLowerCase())) return false;
    const features = featuresOf(device);
    if (!features) return false;
    if (typeof query.budgetMax === "number" && query.budgetMax > 0) {
      if (device.startingPrice === null || device.startingPrice > query.budgetMax) return false;
    }
    if (!query.includeOlder && features.releaseYear && currentYear - features.releaseYear > 3) return false;
    if (/cancelled/i.test(features.status)) return false;
    for (const requirement of query.mustHave ?? []) {
      if (!passesMustHave(features, requirement)) return false;
    }
    return true;
  });

  const entries = Object.entries(scenario.weights) as Array<[CriterionId, number]>;
  const ranked = pool.map((device) => {
    const features = featuresOf(device)!;
    const values = criterionValues(device, features);
    let total = 0;
    const breakdown = entries.map(([criterion, weight]) => {
      const score = values[criterion];
      total += score * weight;
      return { criterion, weight, score: Math.round(score * 100) / 100 };
    });
    const reasons = breakdown
      .slice()
      .sort((a, b) => b.weight * b.score - a.weight * a.score)
      .map((entry) => fact(entry.criterion, device, features))
      .filter((text): text is string => Boolean(text))
      .slice(0, 3);
    return { device, score: Math.round(total * 1000) / 10, reasons, breakdown };
  }).sort((a, b) => b.score - a.score);

  return {
    scenario,
    total: devices.length,
    considered: pool.length,
    recommendations: ranked.slice(0, limit),
  };
}
