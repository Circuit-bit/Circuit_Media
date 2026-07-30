import { rateLimit, requestId, safeJson } from "../../../../lib/http/api";
import { resolveLiveDevice } from "../../../../lib/live/live-catalog";
import { providers } from "../../../../lib/providers/providers";

export async function POST(request: Request) {
  const limited = rateLimit(request, 8, 60_000);
  if (limited) return limited;
  const body = await safeJson<{ deviceId?: string }>(request);
  const device = body?.deviceId ? await resolveLiveDevice(body.deviceId, request.signal) : null;
  if (!device) return Response.json({ error: "Valid deviceId required" }, { status: 400 });
  const id = requestId(request);
  const verifiedFacts = device.specifications.flatMap((group) => group.items.filter((item) => item.status === "verified").map((item) => ({ group: group.name, label: item.label, value: item.value, sourceId: item.sourceId })));
  const result = await providers.ai.createStructuredSummary({ name: `${device.brand} ${device.model}`, sourceIds: device.sources.map((source) => source.id), verifiedFacts }, { requestId: id, signal: request.signal });
  return Response.json({ data: result, meta: { label: "AI-assisted summary", requestId: id } });
}
