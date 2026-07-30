import { log, rateLimit, requestId } from "../../../lib/http/api";
import { liveList } from "../../../lib/live/live-catalog";
import { searchDevices } from "../../../lib/seed/search";
import type { DeviceCategory } from "../../../lib/types";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const url = new URL(request.url);
  const id = requestId(request);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const category = (url.searchParams.get("category") ?? "all") as DeviceCategory | "all";
  const brand = url.searchParams.get("brand") ?? undefined;
  const maxPrice = url.searchParams.get("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined;
  const sort = (url.searchParams.get("sort") as "popular" | "score" | "newest" | "price-low" | null) ?? undefined;
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 24);

  // Spec-aware / price / brand filters that need local scoring stay on the seeded corpus when no free-text query.
  // Free-text and brand browsing go live to GSMArena so the full site catalog is searchable.
  if (query || (brand && brand !== "all")) {
    const result = await liveList({ page, limit, category, brand, query, signal: request.signal });
    let data = result.devices;
    if (typeof maxPrice === "number") data = data.filter((device) => device.startingPrice === null || device.startingPrice <= maxPrice);
    log("devices.search", { requestId: id, count: data.length, provider: result.provider });
    return Response.json({
      data,
      meta: {
        count: data.length,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
        provider: result.provider,
        requestId: id,
      },
    }, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
  }

  const matched = searchDevices({ query, category, brand, maxPrice, sort });
  const pageSize = Math.min(Math.max(limit || 24, 1), 48);
  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  const safePage = Math.min(Math.max(page || 1, 1), totalPages);
  const data = matched.slice((safePage - 1) * pageSize, safePage * pageSize);
  log("devices.search", { requestId: id, count: data.length, provider: "catalog" });
  return Response.json({
    data,
    meta: { count: data.length, total: matched.length, page: safePage, pageSize, totalPages, hasNext: safePage < totalPages, hasPrevious: safePage > 1, provider: "catalog", requestId: id },
  }, { headers: { "cache-control": "public, max-age=120, s-maxage=600" } });
}
