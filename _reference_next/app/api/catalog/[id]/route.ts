import { rateLimit, requestId } from "../../../../lib/http/api";
import { getMobileDevice, MobileApiError } from "../../../../lib/providers/mobileapi";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await params;
  try {
    const data = await getMobileDevice(id, request.signal);
    return Response.json({ data, meta: { provider: "mobileapi", requestId: requestId(request) } }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
  } catch (error) {
    const status = error instanceof MobileApiError && error.status === 404 ? 404 : error instanceof MobileApiError && error.status === 400 ? 400 : 502;
    return Response.json({ error: status === 404 ? "Device not found" : "Device provider unavailable", requestId: requestId(request) }, { status });
  }
}
