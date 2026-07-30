import { rateLimit, requestId } from "../../../../lib/http/api";
import { resolveLiveDevice } from "../../../../lib/live/live-catalog";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const id = requestId(request);
  const { slug } = await params;
  const device = await resolveLiveDevice(decodeURIComponent(slug), request.signal);
  return device
    ? Response.json({ data: device, meta: { requestId: id, provider: "live" } }, { headers: { "cache-control": "public, max-age=300, s-maxage=1800" } })
    : Response.json({ error: "Device not found" }, { status: 404 });
}
