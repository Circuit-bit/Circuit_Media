import { log, rateLimit, requestId } from "../../../lib/http/api";
import { liveList } from "../../../lib/live/live-catalog";
import type { DeviceCategory } from "../../../lib/types";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const id = requestId(request);
  const url = new URL(request.url);
  const category = (url.searchParams.get("category") ?? "all") as DeviceCategory | "all";
  const brand = url.searchParams.get("brand") ?? undefined;
  const query = url.searchParams.get("q")?.trim() ?? "";

  const result = await liveList({
    page: Number(url.searchParams.get("page") ?? 1),
    limit: Number(url.searchParams.get("limit") ?? 24),
    category,
    brand,
    query,
    signal: request.signal,
  });

  log("devices.list", { requestId: id, count: result.devices.length, provider: result.provider, total: result.total });
  return Response.json({
    data: result.devices,
    meta: {
      count: result.devices.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
      provider: result.provider,
      brand: result.brand ?? null,
      requestId: id,
    },
  }, { headers: { "cache-control": "public, max-age=120, s-maxage=600" } });
}
