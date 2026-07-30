#!/usr/bin/env node
/**
 * Circuit Media catalog seeder.
 *
 * Pulls real device data (specifications, photos, prices) from a GSMArena-backed
 * specs API and writes it to lib/data/devices.json. Re-running is incremental:
 * devices already present are kept unless --refresh is passed.
 *
 * Usage:
 *   node scripts/seed.mjs                 # incremental seed
 *   node scripts/seed.mjs --refresh       # re-fetch everything
 *   node scripts/seed.mjs --limit 10      # max devices per brand (default 28)
 *   SPECS_API_URL=https://your-own.vercel.app node scripts/seed.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = (process.env.SPECS_API_URL || "https://mobile-specs-api-sandy.vercel.app").replace(/\/$/, "");
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "data", "devices.json");

const REFRESH = process.argv.includes("--refresh");
const limitArgIndex = process.argv.indexOf("--limit");
const PER_BRAND = limitArgIndex > -1 ? Number(process.argv[limitArgIndex + 1]) || 28 : 28;
const CONCURRENCY = 3;

/** GSMArena brand-page slugs for the brands we want in the catalog. */
const BRANDS = [
  { name: "Apple", slug: "apple-phones-48" },
  { name: "Samsung", slug: "samsung-phones-9" },
  { name: "Google", slug: "google-phones-107" },
  { name: "Xiaomi", slug: "xiaomi-phones-80" },
  { name: "OnePlus", slug: "oneplus-phones-95" },
  { name: "Oppo", slug: "oppo-phones-82" },
  { name: "vivo", slug: "vivo-phones-98" },
  { name: "Realme", slug: "realme-phones-118" },
  { name: "Motorola", slug: "motorola-phones-4" },
  { name: "Nothing", slug: "nothing-phones-128" },
  { name: "Honor", slug: "honor-phones-121" },
  { name: "Huawei", slug: "huawei-phones-58" },
  { name: "Sony", slug: "sony-phones-7" },
  { name: "Asus", slug: "asus-phones-46" },
  { name: "Lenovo", slug: "lenovo-phones-73" },
  { name: "Infinix", slug: "infinix-phones-119" },
  { name: "Tecno", slug: "tecno-phones-120" },
  { name: "ZTE", slug: "zte-phones-62" },
];

/** Extra searches so tablets and watches get good coverage beyond brand recency. */
const SUPPLEMENTAL_SEARCHES = [
  "watch", "galaxy watch", "apple watch", "pixel watch", "huawei watch",
  "ipad", "galaxy tab", "xiaomi pad", "matepad", "lenovo tab", "oneplus pad", "iqoo pad",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, attempt = 1) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload && payload.status === false) throw new Error(payload.message || "API returned status:false");
    return payload;
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(1500 * attempt);
    return api(path, attempt + 1);
  }
}

function detectCategory(name, slug) {
  const haystack = `${name} ${slug}`.toLowerCase();
  if (/\b(watch|band|fit\d|fit\b|fit2|loop)\b|smartwatch|_watch|_band|_fit/.test(haystack)) return "watch";
  if (/\bipad|matepad|\btab\b|_tab_|\bpad\b|_pad|tablet|pad_\d|pad\s/.test(haystack)) return "tablet";
  return "phone";
}

function brandFromSlug(deviceSlug) {
  const first = deviceSlug.split("_")[0];
  const known = BRANDS.find((brand) => brand.name.toLowerCase() === first.toLowerCase());
  if (known) return known.name;
  return first ? first[0].toUpperCase() + first.slice(1) : "Unknown";
}

function normalize(slug, brandName, listEntry, detail) {
  const specs = detail.specifications || {};
  const name = detail.model || listEntry?.name || slug;
  const fullName = name.toLowerCase().startsWith(brandName.toLowerCase()) ? name : `${brandName} ${name}`;
  return {
    slug,
    brand: brandName,
    name: fullName,
    category: detectCategory(fullName, slug),
    imageUrl: detail.imageUrl || listEntry?.imageUrl || null,
    thumbUrl: listEntry?.thumbUrl || detail.imageUrl || null,
    deviceImages: Array.isArray(detail.device_images) ? detail.device_images.filter((entry) => entry && entry.url) : [],
    reviewUrl: detail.review_url || null,
    releaseDate: detail.release_date || "",
    dimensions: detail.dimensions || "",
    os: detail.os || "",
    storage: detail.storage || "",
    specifications: specs,
    sourceUrl: `https://www.gsmarena.com/${slug}.php`,
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

async function loadExisting() {
  if (REFRESH) return new Map();
  try {
    const raw = JSON.parse(await readFile(OUTPUT, "utf8"));
    return new Map((raw.devices || []).map((device) => [device.slug, device]));
  } catch {
    return new Map();
  }
}

async function collectSlugs() {
  /** slug -> { brand, listEntry } */
  const wanted = new Map();

  for (const brand of BRANDS) {
    try {
      const payload = await api(`/brands/${brand.slug}`);
      const list = Array.isArray(payload.data) ? payload.data : [];
      let taken = 0;
      for (const entry of list) {
        if (!entry?.slug || taken >= PER_BRAND) continue;
        if (!wanted.has(entry.slug)) {
          wanted.set(entry.slug, { brand: brand.name, listEntry: entry });
          taken += 1;
        }
      }
      console.log(`[brand] ${brand.name}: ${taken} devices queued`);
    } catch (error) {
      console.warn(`[brand] ${brand.name} FAILED: ${error.message}`);
    }
    await sleep(250);
  }

  for (const query of SUPPLEMENTAL_SEARCHES) {
    try {
      const payload = await api(`/search?query=${encodeURIComponent(query)}`);
      const list = Array.isArray(payload.data) ? payload.data : [];
      let added = 0;
      for (const entry of list) {
        if (!entry?.slug || wanted.has(entry.slug)) continue;
        wanted.set(entry.slug, { brand: brandFromSlug(entry.slug), listEntry: entry });
        added += 1;
      }
      console.log(`[search] "${query}": +${added} devices`);
    } catch (error) {
      console.warn(`[search] "${query}" FAILED: ${error.message}`);
    }
    await sleep(250);
  }

  return wanted;
}

async function main() {
  console.log(`Seeding from ${API_BASE}`);
  const existing = await loadExisting();
  const wanted = await collectSlugs();
  console.log(`Total queued: ${wanted.size} (already have ${existing.size})`);

  const queue = [...wanted.entries()].filter(([slug]) => !existing.has(slug));
  console.log(`To fetch: ${queue.length} device details`);

  let done = 0;
  let failed = 0;
  const results = new Map(existing);

  async function worker() {
    while (queue.length) {
      const [slug, info] = queue.shift();
      try {
        const payload = await api(`/${encodeURIComponent(slug)}`);
        const detail = payload.data || payload;
        if (!detail || (!detail.specifications && !detail.model)) throw new Error("empty detail");
        results.set(slug, normalize(slug, info.brand, info.listEntry, detail));
        done += 1;
      } catch (error) {
        failed += 1;
        console.warn(`[detail] ${slug} FAILED: ${error.message}`);
      }
      if ((done + failed) % 25 === 0) console.log(`[progress] fetched=${done} failed=${failed} remaining=${queue.length}`);
      await sleep(300);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const devices = [...results.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "GSMArena via mobile-specs-api",
    apiBase: API_BASE,
    count: devices.length,
    devices,
  }));

  const byCategory = devices.reduce((acc, device) => { acc[device.category] = (acc[device.category] || 0) + 1; return acc; }, {});
  console.log(`DONE: wrote ${devices.length} devices to ${OUTPUT}`);
  console.log(`Categories: ${JSON.stringify(byCategory)} | new=${done} failed=${failed}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
