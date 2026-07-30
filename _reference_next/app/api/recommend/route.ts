import { log, rateLimit, requestId, safeJson } from "../../../lib/http/api";
import { recommend, SCENARIOS, type MustHaveId, type RecommendationQuery } from "../../../lib/seed/recommend";
import { serverEnvironment } from "../../../lib/http/runtime-env";
import type { DeviceCategory } from "../../../lib/types";

type RequestBody = {
  scenario?: string;
  category?: DeviceCategory | "all";
  budgetMax?: number | null;
  brands?: string[];
  mustHave?: MustHaveId[];
  includeOlder?: boolean;
  limit?: number;
};

/** Optional LLM narrative on top of the deterministic ranking. */
async function aiNarrative(resultSummary: string, signal?: AbortSignal): Promise<string | null> {
  const endpoint = serverEnvironment("AI_API_URL");
  const apiKey = serverEnvironment("AI_API_KEY");
  if (!endpoint || !apiKey) return null;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: serverEnvironment("AI_MODEL") ?? "provider-default",
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a concise tech-buying advisor. Using ONLY the supplied ranked facts, write 2-3 sentences explaining the top recommendation and when the runner-up is the better pick. Never invent specs or prices." },
          { role: "user", content: resultSummary },
        ],
      }),
      signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    return text && text.length < 1200 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, 20, 60_000);
  if (limited) return limited;
  const id = requestId(request);
  const body = await safeJson<RequestBody>(request);
  if (!body?.scenario || !SCENARIOS.some((scenario) => scenario.id === body.scenario)) {
    return Response.json({ error: "A valid scenario id is required", scenarios: SCENARIOS.map((scenario) => scenario.id) }, { status: 400 });
  }

  const query: RecommendationQuery = {
    scenario: body.scenario,
    category: body.category ?? "all",
    budgetMax: typeof body.budgetMax === "number" && body.budgetMax > 0 ? body.budgetMax : null,
    brands: Array.isArray(body.brands) ? body.brands.slice(0, 10) : [],
    mustHave: Array.isArray(body.mustHave) ? body.mustHave.slice(0, 8) : [],
    includeOlder: Boolean(body.includeOlder),
    limit: body.limit,
  };
  const result = recommend(query);

  let narrative: string | null = null;
  if (result.recommendations.length >= 2) {
    const summary = result.recommendations.slice(0, 3).map((entry, index) =>
      `#${index + 1} ${entry.device.brand} ${entry.device.model} (fit ${entry.score}/100${entry.device.startingPrice ? `, $${entry.device.startingPrice}` : ""}): ${entry.reasons.join("; ")}`
    ).join("\n");
    narrative = await aiNarrative(`Use case: ${result.scenario.label}.\n${summary}`, request.signal);
  }

  log("recommend", { requestId: id, scenario: query.scenario, considered: result.considered, returned: result.recommendations.length, ai: Boolean(narrative) });
  return Response.json({
    data: { ...result, narrative },
    meta: { requestId: id, engine: "deterministic-weighted-scoring", aiEnhanced: Boolean(narrative) },
  });
}

export async function GET() {
  return Response.json({
    endpoint: "POST /api/recommend",
    body: {
      scenario: SCENARIOS.map((scenario) => scenario.id),
      category: ["all", "phone", "tablet", "watch"],
      budgetMax: "number | null",
      brands: "string[]",
      mustHave: ["5g", "nfc", "water", "wireless", "telephoto", "sdcard", "jack", "esim"],
      includeOlder: "boolean",
      limit: "1-24",
    },
  });
}
