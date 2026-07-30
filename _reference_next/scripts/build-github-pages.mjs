/**
 * Build full client-side Circuit Media app data for GitHub Pages.
 * Usage: node scripts/build-github-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("Circuit_Media_Review");
const ASSETS = path.join(OUT, "assets");
const DATA = path.join(OUT, "data");
fs.mkdirSync(ASSETS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const raw = JSON.parse(fs.readFileSync("lib/seed/data/devices.json", "utf8"));
const seeds = raw.devices || raw;

function cleanHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSlug(slug) {
  return String(slug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function num(text) {
  const m = String(text || "").replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function yearFrom(text) {
  const m = String(text || "").match(/20[0-3]\d/);
  return m ? Number(m[0]) : null;
}

function getSpec(specs, group, key) {
  const g = specs?.[group];
  if (!g) return null;
  if (g[key] != null) return cleanHtml(g[key]);
  const found = Object.entries(g).find(([k]) => k.toLowerCase() === key.toLowerCase());
  return found ? cleanHtml(found[1]) : null;
}

function findSpec(specs, keyPart) {
  if (!specs) return null;
  for (const g of Object.values(specs)) {
    if (!g || typeof g !== "object") continue;
    for (const [k, v] of Object.entries(g)) {
      if (k.toLowerCase().includes(keyPart)) return cleanHtml(v);
    }
  }
  return null;
}

function extractFeatures(seed) {
  const specs = seed.specifications || {};
  const chipset = findSpec(specs, "chipset") || findSpec(specs, "cpu");
  const display = findSpec(specs, "type") || getSpec(specs, "Display", "Type");
  const size = findSpec(specs, "size") || getSpec(specs, "Display", "Size");
  const battery = findSpec(specs, "battery") || getSpec(specs, "Battery", "Type");
  const charge = findSpec(specs, "charging") || findSpec(specs, "charge");
  const camera = getSpec(specs, "Main Camera", "Single") || getSpec(specs, "Main Camera", "Triple") || getSpec(specs, "Main Camera", "Dual") || findSpec(specs, "camera");
  const network = getSpec(specs, "Network", "Technology") || "";
  const body = getSpec(specs, "Body", "Build") || "";
  const misc = getSpec(specs, "Comms", "NFC") || findSpec(specs, "nfc") || "";
  const price = findSpec(specs, "price") || "";
  const ram = findSpec(specs, "internal") || getSpec(specs, "Memory", "Internal") || "";
  const weight = getSpec(specs, "Body", "Weight");
  const os = seed.os || findSpec(specs, "os") || "";

  const displayInches = num(size);
  const refreshHz = (() => {
    const m = String(display || size || "").match(/(\d+)\s*Hz/i);
    return m ? Number(m[1]) : null;
  })();
  const batteryMah = num(battery);
  const chargeWatts = num(charge);
  const mainCameraMp = num(camera);
  const maxRamGb = (() => {
    const m = String(ram).match(/(\d+)\s*GB\s*RAM/i) || String(ram).match(/(\d+)\s*GB/i);
    return m ? Number(m[1]) : null;
  })();
  const priceUsd = (() => {
    const m = String(price).match(/About\s*(\d+)\s*EUR/i) || String(price).match(/\$\s*(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return /EUR/i.test(price) ? Math.round(n * 1.1) : n;
  })();

  let chipsetScore = 45;
  const chip = String(chipset || "").toLowerCase();
  if (/a18|a17|8 elite|8 gen 3|dimensity 9400|tensor g4|snapdragon 8/.test(chip)) chipsetScore = 92;
  else if (/a16|a15|8 gen 2|7\+|dimensity 9|tensor g3|snapdragon 7/.test(chip)) chipsetScore = 78;
  else if (/helio|unisoc|snapdragon 6|snapdragon 4/.test(chip)) chipsetScore = 42;

  const releaseYear = yearFrom(seed.releaseDate);
  const ipRating = (() => {
    const m = String(getSpec(specs, "Body", "SIM") || body || findSpec(specs, "ip") || "").match(/IP\d\d/i);
    return m ? m[0].toUpperCase() : null;
  })();

  return {
    chipset,
    chipsetScore,
    maxRamGb,
    displayInches,
    refreshHz,
    isOled: /oled|amoled/i.test(String(display)),
    displayPanel: /oled|amoled/i.test(String(display)) ? "OLED" : "LCD",
    brightnessNits: num(String(display).match(/(\d+)\s*nits/i)?.[0]),
    mainCameraMp,
    lensCount: /triple/i.test(String(camera)) ? 3 : /dual/i.test(String(camera)) ? 2 : 1,
    hasOis: /ois|optical/i.test(String(camera)),
    hasTelephoto: /tele/i.test(String(camera) + String(findSpec(specs, "tele") || "")),
    hasPeriscope: /periscope/i.test(String(camera)),
    maxVideo: /8k/i.test(String(findSpec(specs, "video") || "")) ? "8K" : /4k/i.test(String(findSpec(specs, "video") || "")) ? "4K" : null,
    batteryMah,
    chargeWatts,
    wirelessCharging: /wireless/i.test(String(charge)),
    weightGrams: num(weight),
    thicknessMm: num(getSpec(specs, "Body", "Dimensions")),
    waterResistant: Boolean(ipRating && /IP6[78]/i.test(ipRating)),
    ipRating,
    premiumBuild: /glass|aluminum|titanium|stainless/i.test(body),
    has5g: /5g/i.test(network),
    hasNfc: /yes|nfc/i.test(misc) || /nfc/i.test(JSON.stringify(specs.Comms || {})),
    hasJack: /3\.5mm|yes/i.test(String(findSpec(specs, "3.5") || "")),
    cardSlot: /microSD|dedicated|shared/i.test(String(getSpec(specs, "Memory", "Card slot") || "")),
    hasEsim: /eSIM/i.test(String(getSpec(specs, "Body", "SIM") || "")),
    stylusSupport: /stylus|s pen|pencil/i.test(JSON.stringify(specs).toLowerCase()),
    hasGps: /GPS|Yes/i.test(String(getSpec(specs, "Comms", "GPS") || "Yes")),
    sensors: getSpec(specs, "Features", "Sensors"),
    releaseYear,
    status: seed.releaseDate || "",
    priceUsd,
    os,
  };
}

function scoreComponents(features, category) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const scale = (value, min, max) => (value == null ? 0.35 : clamp01((value - min) / (max - min)));
  const performance = 0.75 * (features.chipsetScore / 100) + 0.25 * scale(features.maxRamGb, 2, 16);
  const display =
    (features.isOled ? 0.35 : 0.1) +
    0.3 * scale(features.refreshHz, 60, 144) +
    0.15 * scale(features.brightnessNits, 400, 3000);
  const camera =
    0.35 * scale(features.mainCameraMp ? Math.log(features.mainCameraMp) : null, Math.log(5), Math.log(200)) +
    0.2 * clamp01((features.lensCount || 1) / 4) +
    (features.hasOis ? 0.15 : 0) +
    (features.hasTelephoto ? 0.15 : 0);
  const batteryRange = category === "tablet" ? [5000, 12000] : category === "watch" ? [200, 700] : [3000, 6500];
  const battery =
    0.6 * scale(features.batteryMah, batteryRange[0], batteryRange[1]) +
    0.3 * scale(features.chargeWatts, 5, 120) +
    (features.wirelessCharging ? 0.1 : 0);
  const build =
    (features.waterResistant ? 0.45 : features.ipRating ? 0.25 : 0) +
    (features.premiumBuild ? 0.3 : 0.12) +
    0.15;
  const toTen = (v) => Math.round(clamp01(v) * 100) / 10;
  return {
    performance: toTen(performance),
    display: toTen(display),
    camera: toTen(camera),
    battery: toTen(battery),
    build: toTen(build),
  };
}

function overall(scores, category) {
  const w =
    category === "tablet"
      ? { performance: 0.3, display: 0.3, camera: 0.1, battery: 0.2, build: 0.1 }
      : category === "watch"
        ? { performance: 0.15, display: 0.25, camera: 0, battery: 0.35, build: 0.25 }
        : { performance: 0.25, display: 0.2, camera: 0.25, battery: 0.2, build: 0.1 };
  const raw =
    scores.performance * w.performance +
    scores.display * w.display +
    scores.camera * w.camera +
    scores.battery * w.battery +
    scores.build * w.build;
  return Math.round(Math.max(4, Math.min(9.8, 4 + (raw - 1.5) * 0.83)) * 10) / 10;
}

const accents = ["#c8b5a3", "#9aaeb5", "#d9c2b8", "#30556a", "#dedbd3", "#23262f", "#a3b5c8"];
function accentFor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return accents[hash % accents.length];
}

const SCENARIOS = [
  { id: "everyday", label: "Everyday all-rounder", description: "Balanced performance, battery, and camera for daily life.", categories: ["phone", "tablet"], weights: { performance: 0.2, display: 0.15, camera: 0.2, battery: 0.2, value: 0.15, recency: 0.1 } },
  { id: "gaming", label: "Mobile gaming", description: "Sustained performance, high refresh-rate display, and battery to match.", categories: ["phone", "tablet"], weights: { performance: 0.4, display: 0.25, battery: 0.15, charging: 0.1, recency: 0.1 } },
  { id: "photography", label: "Photography", description: "Camera hardware first: sensors, stabilization, and optical zoom.", categories: ["phone"], weights: { camera: 0.4, zoom: 0.15, display: 0.15, performance: 0.15, battery: 0.1, recency: 0.05 } },
  { id: "battery", label: "Marathon battery", description: "Days of use and fast top-ups.", categories: ["phone", "tablet", "watch"], weights: { battery: 0.5, charging: 0.2, performance: 0.1, display: 0.1, value: 0.1 } },
  { id: "value", label: "Best value on a budget", description: "The most capability per dollar.", categories: ["phone", "tablet", "watch"], weights: { value: 0.45, battery: 0.15, performance: 0.15, display: 0.1, camera: 0.1, recency: 0.05 } },
  { id: "compact", label: "Compact & light", description: "Easy one-hand use without giving up too much.", categories: ["phone"], weights: { portability: 0.4, display: 0.15, camera: 0.15, performance: 0.15, battery: 0.15 } },
  { id: "media", label: "Media & streaming", description: "The best screen for movies and reading.", categories: ["phone", "tablet"], weights: { display: 0.4, battery: 0.25, portability: 0.1, value: 0.15, performance: 0.1 } },
  { id: "fitness", label: "Fitness & outdoors", description: "GPS, health sensors, and endurance.", categories: ["watch"], weights: { fitness: 0.35, battery: 0.3, durability: 0.25, display: 0.1 } },
];

const MUST_HAVES = [
  { id: "5g", label: "5G", categories: ["phone", "tablet"] },
  { id: "nfc", label: "NFC payments", categories: ["phone", "watch"] },
  { id: "water", label: "Water resistant", categories: ["phone", "tablet", "watch"] },
  { id: "wireless", label: "Wireless charging", categories: ["phone", "watch"] },
  { id: "telephoto", label: "Telephoto zoom", categories: ["phone"] },
  { id: "sdcard", label: "Expandable storage", categories: ["phone", "tablet"] },
];

const catalog = seeds.map((seed) => {
  const features = extractFeatures(seed);
  const componentScores = scoreComponents(features, seed.category);
  const score = overall(componentScores, seed.category);
  const routeSlug = cleanSlug(seed.slug);
  const model = seed.name.toLowerCase().startsWith(seed.brand.toLowerCase())
    ? seed.name.slice(seed.brand.length).trim() || seed.name
    : seed.name;
  const releaseYear = features.releaseYear || 2020;
  const popularity = Math.max(
    1,
    Math.min(100, Math.round(40 + (features.chipsetScore / 100) * 30 + Math.max(0, 20 - (new Date().getFullYear() - releaseYear) * 5))),
  );
  const specs = Object.entries(seed.specifications || {})
    .slice(0, 12)
    .map(([name, entries]) => ({
      name,
      items: Object.entries(entries || {})
        .slice(0, 18)
        .map(([label, value]) => ({ label, value: cleanHtml(value) }))
        .filter((i) => i.value),
    }))
    .filter((g) => g.items.length);

  const pros = [];
  const cons = [];
  if (features.chipsetScore >= 85) pros.push("Strong performance");
  if (features.isOled && (features.refreshHz || 60) >= 120) pros.push(`Smooth ${features.refreshHz}Hz OLED`);
  if ((features.batteryMah || 0) >= 5000) pros.push(`Large ${features.batteryMah} mAh battery`);
  if (features.waterResistant) pros.push(`${features.ipRating} water resistance`);
  if ((features.refreshHz || 60) <= 60 && seed.category === "phone") cons.push("60Hz display");
  if (!features.waterResistant && seed.category === "phone") cons.push("No official water resistance");
  if (features.chipsetScore < 50) cons.push("Entry-level performance");

  return {
    id: routeSlug,
    slug: routeSlug,
    brand: seed.brand,
    model,
    category: seed.category,
    releaseDate: seed.releaseDate || `${releaseYear}-01-01`,
    startingPrice: features.priceUsd,
    score,
    popularity,
    summary: `${seed.brand} ${model} — ${features.chipset ? features.chipset.split("(")[0].trim() : "catalog specs"} with sourced specifications.`,
    bestFor: pros.slice(0, 3).length ? pros.slice(0, 3) : ["Everyday use"],
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 4),
    accent: accentFor(seed.brand + seed.slug),
    imageUrl: seed.imageUrl || seed.thumbUrl || null,
    photos: (seed.deviceImages || []).slice(0, 6),
    componentScores,
    specifications: specs,
    features,
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  siteName: "Circuit Media",
  basePath: "/Circuit_Media",
  stats: {
    devices: catalog.length,
    brands: new Set(catalog.map((d) => d.brand)).size,
    phones: catalog.filter((d) => d.category === "phone").length,
    tablets: catalog.filter((d) => d.category === "tablet").length,
    watches: catalog.filter((d) => d.category === "watch").length,
  },
  brands: [...new Set(catalog.map((d) => d.brand))].sort(),
  scenarios: SCENARIOS,
  mustHaves: MUST_HAVES,
  devices: catalog,
};

fs.writeFileSync(path.join(DATA, "catalog.json"), JSON.stringify(payload));
console.log(
  `Wrote ${catalog.length} devices (${(fs.statSync(path.join(DATA, "catalog.json")).size / 1024 / 1024).toFixed(2)} MB)`,
);

for (const file of ["circuit-media-mark.png", "circuit-media-logo.png", "hero-device.webp", "hero-device.png", "og.png"]) {
  const src = path.resolve("public", file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(ASSETS, file));
}

const stylesSrc = path.resolve("app/globals.css");
if (fs.existsSync(stylesSrc)) {
  let css = fs.readFileSync(stylesSrc, "utf8").replace(/^@import "tailwindcss";\n?/, "");
  css = `/* Circuit Media — GitHub Pages full client app */
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap");
:root { --font-display: "Plus Jakarta Sans", sans-serif; --font-body: "Manrope", sans-serif; }
${css}
.pages-banner{background:#17133a;color:#fff;text-align:center;padding:10px 16px;font-size:13px;font-weight:600}
.pages-banner strong{color:#ffe56a}
#app-root{min-height:60vh}
.route-loading{padding:80px 7%;color:var(--muted)}
`;
  fs.writeFileSync(path.join(ASSETS, "styles.css"), css);
}

console.log("GitHub Pages bundle ready in Circuit_Media_Review/");
