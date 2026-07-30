import { rateLimit, requestId, safeJson } from "../../../../lib/http/api";
import { resolveLiveDevice } from "../../../../lib/live/live-catalog";
import { providers } from "../../../../lib/providers/providers";

export async function POST(request: Request) {
  const limited = rateLimit(request, 8, 60_000);
  if (limited) return limited;
  const body = await safeJson<{ deviceIds?: string[]; priorities?: string[] }>(request);
  const selected = (await Promise.all((body?.deviceIds ?? []).slice(0, 4).map((id) => resolveLiveDevice(id, request.signal)))).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (selected.length < 2) return Response.json({ error: "Choose at least two valid devices" }, { status: 400 });
  const id = requestId(request);
  const sourceIds = selected.flatMap((device) => device.sources.map((source) => source.id));
  const verifiedFacts = selected.map((device) => ({ name: `${device.brand} ${device.model}`, facts: device.specifications.flatMap((group) => group.items.filter((item) => item.status === "verified").map((item) => ({ label: item.label, value: item.value, sourceId: item.sourceId }))) }));
  const result = await providers.ai.createStructuredSummary({ name: selected.map((device) => device.model).join(" vs "), priorities: body?.priorities ?? [], sourceIds, verifiedFacts, instruction: "Do not declare a winner when evidence is insufficient" }, { requestId: id, signal: request.signal });
  return Response.json({ data: result, meta: { label: "AI-assisted comparison", requestId: id } });
}
