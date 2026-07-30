/**
 * Live catalog orchestration: GSMArena is the primary source of truth.
 * The seeded JSON dataset remains a fast offline fallback for recommendations
 * and when the upstream API is unavailable.
 */
import {
  getDevice,
  guessSourceSlug,
  listItemToDevice,
  rememberFeatures,
  toDevice,
  devices as seededDevices,
} from "../seed/catalog";
import {
  findGsmBrand,
  getGsmDevice,
  listGsmBrandDevices,
  listGsmBrands,
  searchGsmDevices,
  topGsmByFans,
  topGsmByInterest,
  totalGsmDeviceCount,
  type GsmBrand,
  type GsmListItem,
} from "./gsmarena";
import { searchDevices } from "../seed/search";
import type { Device, DeviceCategory } from "../types";

export type LivePage = {
  devices: Device[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  provider: "live" | "catalog";
  brand?: GsmBrand;
};

function paginateLocal(items: Device[], page: number, pageSize: number): LivePage {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return {
    devices: slice,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
    provider: "catalog",
  };
}

function dedupeList(items: GsmListItem[]): GsmListItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

export async function resolveLiveDevice(slugOrId: string, signal?: AbortSignal): Promise<Device | null> {
  const local = getDevice(slugOrId);
  const sourceSlug = local?.sourceSlug || guessSourceSlug(slugOrId);
  try {
    const seed = await getGsmDevice(sourceSlug, signal);
    const device = toDevice(seed);
    rememberFeatures(device, seed);
    return device;
  } catch {
    return local ?? null;
  }
}

export async function liveBrands(signal?: AbortSignal): Promise<{ brands: GsmBrand[]; totalDevices: number }> {
  try {
    const brands = await listGsmBrands(signal);
    return { brands, totalDevices: totalGsmDeviceCount(brands) };
  } catch {
    const names = [...new Set(seededDevices.map((device) => device.brand))].sort();
    const brands: GsmBrand[] = names.map((name, index) => ({
      name,
      brandId: index + 1,
      brandSlug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      deviceCount: seededDevices.filter((device) => device.brand === name).length,
      detailUrl: `/brands/${name.toLowerCase()}`,
    }));
    return { brands, totalDevices: seededDevices.length };
  }
}

export async function liveList(options: {
  page?: number;
  limit?: number;
  category?: DeviceCategory | "all";
  brand?: string;
  query?: string;
  signal?: AbortSignal;
}): Promise<LivePage> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, options.limit ?? 24));
  const category = options.category ?? "all";
  const brandName = options.brand?.trim();
  const query = options.query?.trim() ?? "";

  try {
    if (query) {
      const hits = await searchGsmDevices(query, options.signal);
      const filtered = hits.filter((item) => category === "all" || item.category === category)
        .filter((item) => !brandName || item.brand.toLowerCase() === brandName.toLowerCase());
      const liveCards = filtered.map((item, index) => listItemToDevice(item, 100 - index));

      // Always merge the local analysis cache so seeded devices stay findable when
      // the upstream search endpoint misses a brand or model (common for Oppo/Asus/etc.).
      const localCards = searchDevices({ query, category, brand: brandName });
      const seen = new Set(liveCards.map((device) => device.sourceSlug || device.slug));
      const merged = [
        ...liveCards,
        ...localCards.filter((device) => {
          const key = device.sourceSlug || device.slug;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      ];
      return { ...paginateLocal(merged, page, pageSize), provider: "live", total: merged.length };
    }

    if (brandName) {
      const brand = await findGsmBrand(brandName, options.signal);
      if (brand) {
        // Brand pages are fixed at ~50 items; map our pageSize onto GSMArena pages.
        const gsmPage = page;
        const result = await listGsmBrandDevices(brand.brandSlug, gsmPage, options.signal);
        const filtered = result.devices.filter((item) => category === "all" || item.category === category);
        const devices = filtered.map((item, index) => listItemToDevice(item, 90 - index));
        const totalPages = Math.max(1, Math.ceil(brand.deviceCount / result.pageSize));
        return {
          devices,
          total: brand.deviceCount,
          page: gsmPage,
          pageSize: result.pageSize,
          totalPages,
          hasNext: result.hasNext || gsmPage < totalPages,
          hasPrevious: gsmPage > 1,
          provider: "live",
          brand,
        };
      }
    }

    // Category / homepage browse: merge live interest + fans rankings, filter by category.
    const [interest, fans] = await Promise.all([
      topGsmByInterest(options.signal),
      topGsmByFans(options.signal),
    ]);
    let merged = dedupeList([...interest, ...fans]);
    if (category !== "all") merged = merged.filter((item) => item.category === category);

    // Supplement with seeded devices in that category so pagination has depth.
    const seededExtra = seededDevices
      .filter((device) => category === "all" || device.category === category)
      .filter((device) => !merged.some((item) => item.slug === device.sourceSlug));
    const liveCards = merged.map((item, index) => listItemToDevice(item, 100 - index));
    const combined = [...liveCards, ...seededExtra];
    return { ...paginateLocal(combined, page, pageSize), provider: "live" };
  } catch {
    const filtered = searchDevices({
      query,
      category,
      brand: brandName,
    });
    return paginateLocal(filtered, page, pageSize);
  }
}

export async function liveFeatured(signal?: AbortSignal): Promise<{ popular: Device[]; latest: Device[]; totalDevices: number; brandCount: number }> {
  try {
    const [{ brands, totalDevices }, interest, fans] = await Promise.all([
      liveBrands(signal),
      topGsmByInterest(signal),
      topGsmByFans(signal),
    ]);
    const popular = dedupeList([...interest, ...fans]).slice(0, 8).map((item, index) => listItemToDevice(item, 100 - index));
    const latest = interest.slice(0, 6).map((item, index) => listItemToDevice(item, 95 - index));
    return { popular, latest, totalDevices, brandCount: brands.length };
  } catch {
    return {
      popular: seededDevices.slice(0, 8),
      latest: seededDevices.slice().sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 6),
      totalDevices: seededDevices.length,
      brandCount: new Set(seededDevices.map((device) => device.brand)).size,
    };
  }
}
