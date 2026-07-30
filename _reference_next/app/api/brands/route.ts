import { rateLimit, requestId } from "../../../lib/http/api";
import { liveBrands } from "../../../lib/live/live-catalog";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const id = requestId(request);
  const { brands, totalDevices } = await liveBrands(request.signal);
  return Response.json({
    data: brands.map((brand) => ({
      name: brand.name,
      slug: brand.brandSlug,
      brandId: brand.brandId,
      deviceCount: brand.deviceCount,
      href: `/brands/${encodeURIComponent(brand.brandSlug)}`,
    })),
    meta: { count: brands.length, totalDevices, provider: "live", requestId: id },
  }, { headers: { "cache-control": "public, max-age=600, s-maxage=3600" } });
}
