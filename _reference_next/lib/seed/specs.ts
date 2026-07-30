/**
 * Parses raw GSMArena-style specification text into structured, numeric
 * features that the scoring and recommendation engines can reason about.
 */

export type RawSpecifications = Record<string, Record<string, string>>;

export type SeedDevice = {
  slug: string;
  brand: string;
  name: string;
  category: "phone" | "tablet" | "watch";
  imageUrl: string | null;
  thumbUrl: string | null;
  deviceImages: Array<{ color: string; url: string }>;
  reviewUrl: string | null;
  releaseDate: string;
  dimensions: string;
  os: string;
  storage: string;
  specifications: RawSpecifications;
  sourceUrl: string;
  fetchedAt: string;
};

export type DeviceFeatures = {
  releaseYear: number | null;
  announced: string;
  status: string;
  displayInches: number | null;
  displayPanel: string;
  isOled: boolean;
  refreshHz: number | null;
  ppi: number | null;
  brightnessNits: number | null;
  batteryMah: number | null;
  chargeWatts: number | null;
  wirelessCharging: boolean;
  chipset: string;
  chipsetScore: number;
  maxRamGb: number | null;
  maxStorageGb: number | null;
  cardSlot: boolean;
  mainCameraMp: number | null;
  lensCount: number;
  hasTelephoto: boolean;
  hasPeriscope: boolean;
  hasUltrawide: boolean;
  hasOis: boolean;
  maxVideo: string;
  selfieMp: number | null;
  weightGrams: number | null;
  thicknessMm: number | null;
  ipRating: string | null;
  waterResistant: boolean;
  premiumBuild: boolean;
  has5g: boolean;
  hasNfc: boolean;
  hasJack: boolean;
  hasEsim: boolean;
  hasGps: boolean;
  os: string;
  sensors: string;
  stylusSupport: boolean;
  priceUsd: number | null;
  colors: string[];
  models: string;
  variants: string[];
};

export function cleanHtml(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function specText(specs: RawSpecifications, group: string, ...labels: string[]): string {
  const section = specs[group];
  if (!section) return "";
  if (!labels.length) return cleanHtml(Object.values(section).join("\n"));
  for (const label of labels) {
    const key = Object.keys(section).find((candidate) => candidate.toLowerCase() === label.toLowerCase());
    if (key && section[key]) return cleanHtml(section[key]);
  }
  return "";
}

function allText(specs: RawSpecifications, group: string): string {
  const section = specs[group];
  return section ? cleanHtml(Object.entries(section).map(([label, value]) => `${label}: ${value}`).join("\n")) : "";
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function maxNumber(text: string, pattern: RegExp): number | null {
  let best: number | null = null;
  for (const match of text.matchAll(pattern)) {
    const parsed = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(parsed) && (best === null || parsed > best)) best = parsed;
  }
  return best;
}

/**
 * Chipset capability tier, 0–100. Known flagship/mid/entry families are matched
 * by name; anything unknown falls back to a process-node + year heuristic.
 */
export function chipsetTier(chipset: string, releaseYear: number | null): number {
  const c = chipset.toLowerCase();
  if (!c) return 30;
  const table: Array<[RegExp, number]> = [
    [/apple m[4-9]/, 100], [/apple m[1-3]/, 92],
    [/a19 pro/, 100], [/a19\b/, 96], [/a18 pro/, 95], [/a18\b/, 90], [/a17 pro/, 88], [/a1[56]\b|a16 bionic|a15 bionic/, 82], [/a14 bionic/, 74], [/a13 bionic/, 68],
    [/snapdragon 8 elite gen [2-9]|snapdragon 8 elite 2/, 100], [/snapdragon 8 elite/, 97], [/snapdragon 8 gen 3/, 90], [/snapdragon 8s gen 4/, 85], [/snapdragon 8 gen 2/, 84], [/snapdragon 8s gen 3/, 80], [/snapdragon 8\+ gen 1/, 78], [/snapdragon 8 gen 1/, 74],
    [/snapdragon 7\+ gen 3/, 76], [/snapdragon 7 gen 3/, 66], [/snapdragon 7s gen [23]/, 62], [/snapdragon 6 gen [1-9]/, 52], [/snapdragon 4 gen [1-9]/, 42],
    [/snapdragon 888/, 70], [/snapdragon 87[08]/, 68], [/snapdragon 86[05]/, 64], [/snapdragon 78[0-9]g?|snapdragon 77[08]g?/, 58], [/snapdragon 7[0-3][0-9]g?/, 52], [/snapdragon 6[0-9][0-9]/, 45], [/snapdragon 4[0-9][0-9]/, 38],
    [/dimensity 9[45]00/, 96], [/dimensity 9300/, 90], [/dimensity 9200/, 84], [/dimensity 9000/, 78], [/dimensity 8[34]00/, 74], [/dimensity 8[12]00/, 68], [/dimensity 7[0-9]{3}/, 58], [/dimensity 6[0-9]{3}/, 48], [/dimensity (10[0-9]{2}|11[0-9]{2}|12[0-9]{2})/, 56],
    [/exynos 2[45]00/, 88], [/exynos 2200/, 76], [/exynos 2100/, 72], [/exynos 1[45][0-9]{2}/, 60], [/exynos 13[0-9]{2}/, 52], [/exynos 12[0-9]{2}/, 46], [/exynos 9[0-9]{2}/, 40], [/exynos w1000/, 55], [/exynos w9[23]0/, 45],
    [/tensor g[56]/, 84], [/tensor g4/, 80], [/tensor g3/, 74], [/tensor g2/, 68], [/tensor\b/, 62],
    [/kirin 9[0-9]{3}/, 80], [/kirin 8[0-9]{3}/, 62],
    [/apple s1[0-9]|apple s9/, 70], [/apple s[678]/, 55],
    [/snapdragon w5\+? gen [12]/, 60], [/sw5100/, 55],
    [/helio g[89][0-9]{1,2}/, 44], [/helio g[0-7][0-9]/, 36], [/helio p/, 32], [/helio a/, 26],
    [/unisoc t[89][0-9]{2}/, 42], [/unisoc t[67][0-9]{2}/, 34], [/unisoc/, 28],
  ];
  for (const [pattern, score] of table) if (pattern.test(c)) return score;

  const nm = firstNumber(c, /\((\d+(?:\.\d+)?)\s*nm\)/);
  let base = 35;
  if (nm !== null) {
    if (nm <= 3) base = 82;
    else if (nm <= 4) base = 72;
    else if (nm <= 5) base = 62;
    else if (nm <= 7) base = 52;
    else if (nm <= 12) base = 42;
    else base = 32;
  }
  if (releaseYear && releaseYear >= 2024) base += 4;
  return Math.min(base, 100);
}

export function parsePriceUsd(rawPrice: string): number | null {
  const price = cleanHtml(rawPrice);
  if (!price) return null;
  const usd = price.match(/\$\s?([\d,]+(?:\.\d+)?)/);
  if (usd) return Math.round(Number(usd[1].replace(/,/g, "")));
  const eur = price.match(/(?:€\s?|About\s+)([\d,]+(?:\.\d+)?)\s*(?:EUR|€)?/i);
  if (eur && /eur|€/i.test(price)) return Math.round(Number(eur[1].replace(/,/g, "")) * 1.1);
  const inr = price.match(/₹\s?([\d,]+)/);
  if (inr) return Math.round(Number(inr[1].replace(/,/g, "")) * 0.012);
  return null;
}

export function parseReleaseYear(device: SeedDevice): number | null {
  const sources = [
    specText(device.specifications, "Launch", "Announced"),
    device.releaseDate,
    specText(device.specifications, "Launch", "Status"),
  ];
  for (const text of sources) {
    const year = firstNumber(text, /\b(20[0-3][0-9])\b/);
    if (year) return year;
  }
  return null;
}

function parseVariants(internal: string): string[] {
  const variants = new Set<string>();
  for (const match of internal.matchAll(/(\d+(?:GB|TB))\s+(\d+(?:GB|TB))\s+RAM/gi)) {
    variants.add(`${match[1]} / ${match[2]} RAM`);
  }
  if (!variants.size && internal) {
    for (const match of internal.matchAll(/\d+(?:GB|TB)/gi)) variants.add(match[0]);
  }
  return [...variants].slice(0, 8);
}

function toGb(value: number, unit: string): number {
  return /tb/i.test(unit) ? value * 1024 : value;
}

export function extractFeatures(device: SeedDevice): DeviceFeatures {
  const specs = device.specifications;

  const displayType = specText(specs, "Display", "Type");
  const displaySize = specText(specs, "Display", "Size");
  const displayResolution = specText(specs, "Display", "Resolution");
  const displayAll = `${displayType} ${displaySize} ${displayResolution}`;

  const batteryType = specText(specs, "Battery", "Type") || device.storage;
  const charging = specText(specs, "Battery", "Charging");

  const chipset = specText(specs, "Platform", "Chipset");
  const releaseYear = parseReleaseYear(device);

  const memoryInternal = specText(specs, "Memory", "Internal") || cleanHtml(device.storage);
  let maxRamGb: number | null = null;
  let maxStorageGb: number | null = null;
  for (const match of memoryInternal.matchAll(/(\d+(?:\.\d+)?)(GB|TB)\s+(\d+(?:\.\d+)?)(GB|TB)\s+RAM/gi)) {
    const storage = toGb(Number(match[1]), match[2]);
    const ram = toGb(Number(match[3]), match[4]);
    if (maxStorageGb === null || storage > maxStorageGb) maxStorageGb = storage;
    if (maxRamGb === null || ram > maxRamGb) maxRamGb = ram;
  }
  if (maxStorageGb === null) {
    const solo = maxNumber(memoryInternal, /(\d+)GB/gi);
    const tb = maxNumber(memoryInternal, /(\d+)TB/gi);
    maxStorageGb = tb ? tb * 1024 : solo;
  }

  const mainCameraSection = specs["Main Camera"] ?? specs["Main camera"] ?? {};
  const mainCameraKeys = Object.keys(mainCameraSection).map((key) => key.toLowerCase());
  const lensCount = mainCameraKeys.includes("penta") ? 5
    : mainCameraKeys.includes("quad") ? 4
    : mainCameraKeys.includes("triple") ? 3
    : mainCameraKeys.includes("dual") || mainCameraKeys.includes("dual or triple") ? 2
    : mainCameraKeys.includes("single") ? 1 : 0;
  const mainCameraText = allText(specs, "Main Camera") || allText(specs, "Main camera");
  const selfieText = allText(specs, "Selfie camera") || allText(specs, "Selfie Camera");

  const bodyText = allText(specs, "Body");
  const commsText = allText(specs, "Comms");
  const soundText = allText(specs, "Sound");
  const networkText = allText(specs, "Network");
  const featuresText = allText(specs, "Features");
  const miscSection = specs["Misc"] ?? {};

  const dimensions = cleanHtml(device.dimensions) || bodyText;
  const weightGrams = firstNumber(bodyText, /(\d+(?:\.\d+)?)\s*g\b/) ?? firstNumber(dimensions, /(\d+(?:\.\d+)?)\s*g\b/);
  const thicknessMm = firstNumber(cleanHtml(device.dimensions), /(\d+(?:\.\d+)?)\s*mm/) ?? firstNumber(bodyText, /x\s+(\d+(?:\.\d+)?)\s*mm/);

  const ipMatch = `${bodyText} ${featuresText}`.match(/IP[X0-9]{2}[A-Z]?(?:\/IP[X0-9]{2}[A-Z]?)*/i);
  const atmMatch = `${bodyText} ${featuresText}`.match(/\b(\d+)\s?ATM\b/i);
  const ipRating = ipMatch ? ipMatch[0].toUpperCase() : atmMatch ? `${atmMatch[1]}ATM` : null;

  const priceUsd = parsePriceUsd(miscSection["Price"] ?? "");
  const colors = cleanHtml(miscSection["Colors"] ?? "").split(",").map((color) => color.trim()).filter(Boolean);

  const osText = specText(specs, "Platform", "OS") || cleanHtml(device.os);

  return {
    releaseYear,
    announced: specText(specs, "Launch", "Announced"),
    status: specText(specs, "Launch", "Status"),
    displayInches: firstNumber(displaySize, /(\d+(?:\.\d+)?)\s*inches/),
    displayPanel: /amoled|oled|super retina|dynamic amoled|ltpo/i.test(displayType)
      ? "OLED"
      : /ips|lcd|tft|pls/i.test(displayType) ? "LCD" : (displayType.split(",")[0] || "Unknown"),
    isOled: /amoled|oled|super retina/i.test(displayType),
    refreshHz: maxNumber(displayAll, /(\d+)Hz/gi),
    ppi: firstNumber(displayResolution, /~?(\d+)\s*ppi/),
    brightnessNits: maxNumber(displayType, /(\d+)\s*nits/gi),
    batteryMah: firstNumber(cleanHtml(batteryType), /(\d[\d,]{2,})\s*mAh/),
    chargeWatts: maxNumber(charging, /(\d+(?:\.\d+)?)W/gi),
    wirelessCharging: /wireless|magsafe|qi/i.test(charging),
    chipset,
    chipsetScore: chipsetTier(chipset, releaseYear),
    maxRamGb,
    maxStorageGb,
    cardSlot: !/^no/i.test(specText(specs, "Memory", "Card slot") || "no"),
    mainCameraMp: firstNumber(mainCameraText, /(\d+(?:\.\d+)?)\s*MP/i),
    lensCount,
    hasTelephoto: /telephoto|periscope/i.test(mainCameraText),
    hasPeriscope: /periscope/i.test(mainCameraText),
    hasUltrawide: /ultrawide|ultra wide/i.test(mainCameraText),
    hasOis: /\bois\b|optical image stabili[sz]|sensor-shift/i.test(mainCameraText),
    maxVideo: /8k/i.test(mainCameraText) ? "8K" : /4k/i.test(mainCameraText) ? "4K" : /1080p/i.test(mainCameraText) ? "1080p" : "",
    selfieMp: firstNumber(selfieText, /(\d+(?:\.\d+)?)\s*MP/i),
    weightGrams,
    thicknessMm,
    ipRating,
    waterResistant: Boolean(ipRating && /IP6[7-9]|IP68|IP69|ATM/i.test(ipRating)),
    premiumBuild: /titanium|ceramic|stainless steel|sapphire/i.test(bodyText),
    has5g: /5G/.test(networkText),
    hasNfc: /nfc[^:]*:?\s*(?!no\b)/i.test(commsText) && !/NFC:?\s*No\b/i.test(commsText) && /nfc/i.test(commsText),
    hasJack: /3\.5mm jack:?\s*Yes/i.test(soundText),
    hasEsim: /esim/i.test(bodyText),
    hasGps: /gps|positioning:?\s*(?!no\b)/i.test(commsText) && !/positioning:?\s*No\b/i.test(commsText),
    os: osText,
    sensors: specText(specs, "Features", "Sensors"),
    stylusSupport: /stylus|s pen|pencil/i.test(`${featuresText} ${miscSection["Models"] ?? ""} ${bodyText}`),
    priceUsd,
    colors,
    models: cleanHtml(miscSection["Models"] ?? ""),
    variants: parseVariants(memoryInternal),
  };
}
