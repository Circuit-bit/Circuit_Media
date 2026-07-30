import { rateLimit, safeJson } from "../../../lib/http/api";
import { resolveLiveDevice } from "../../../lib/live/live-catalog";

export async function POST(request: Request) {
  const limited = rateLimit(request, 20);
  if (limited) return limited;
  const body = await safeJson<{ deviceIds?: string[]; priorities?: string[] }>(request);
  const ids = [...new Set(body?.deviceIds ?? [])].slice(0, 4);
  if (ids.length < 2) return Response.json({ error: "Choose between 2 and 4 unique devices" }, { status: 400 });
  const selected = (await Promise.all(ids.map((id) => resolveLiveDevice(id, request.signal)))).filter(Boolean);
  if (selected.length !== ids.length) return Response.json({ error: "One or more devices were not found" }, { status: 404 });
  return Response.json({ data: { devices: selected, priorities: body?.priorities ?? [], recommendation: { winner: null, reason: "No winner declared without complete priority-specific evidence", confidence: 0.4 } } });
}
