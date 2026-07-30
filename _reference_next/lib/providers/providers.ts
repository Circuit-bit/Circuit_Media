import { devices } from "../seed/catalog";
import { professionalReviews } from "../seed/reviews";
import type { Device, ProfessionalReview } from "../types";
import { serverEnvironment } from "../http/runtime-env";

export type ProviderContext = {
  requestId: string;
  signal?: AbortSignal;
};

export interface DeviceSpecificationsProvider {
  list(context: ProviderContext): Promise<Device[]>;
  get(slug: string, context: ProviderContext): Promise<Device | null>;
}

export interface ProductImageProvider {
  getOfficialImages(deviceId: string, context: ProviderContext): Promise<Array<{
    url: string;
    sourceUrl: string;
    provider: string;
    license: string;
    verifiedAt: string;
  }>>;
}

export interface PricingProvider {
  getOffers(deviceId: string, context: ProviderContext): Promise<Array<{
    retailer: string;
    price: number;
    currency: string;
    url: string;
    checkedAt: string;
  }>>;
}

export interface ReviewProvider {
  getProfessionalReviews(deviceId: string, context: ProviderContext): Promise<ProfessionalReview[]>;
}

export interface BenchmarkProvider {
  getBenchmarks(deviceId: string, context: ProviderContext): Promise<Array<{
    name: string;
    score: number | null;
    methodologyUrl: string;
    verifiedAt: string;
  }>>;
}

export interface AIProvider {
  createStructuredSummary(input: Record<string, unknown>, context: ProviderContext): Promise<AIResult>;
}

export type AIResult = {
  summary: string;
  pros: string[];
  cons: string[];
  best_for: string[];
  not_recommended_for: string[];
  confidence: number;
  used_source_ids: string[];
  missing_information: string[];
  conflicting_information: string[];
};

export class CatalogSpecificationsProvider implements DeviceSpecificationsProvider {
  async list(context: ProviderContext) { void context; return devices; }
  async get(slug: string, context: ProviderContext) { void context; return devices.find((device) => device.slug === slug || device.id === slug) ?? null; }
}

export class CatalogImageProvider implements ProductImageProvider {
  async getOfficialImages(deviceId: string, context: ProviderContext) {
    void context;
    const device = devices.find((item) => item.id === deviceId);
    if (!device?.image.url) return [];
    return [{ ...device.image, url: device.image.url }];
  }
}

export class CatalogPricingProvider implements PricingProvider {
  async getOffers(deviceId: string, context: ProviderContext) {
    void context;
    const device = devices.find((item) => item.id === deviceId);
    if (!device?.startingPrice) return [];
    return [{ retailer: "Source-listed price", price: device.startingPrice, currency: device.currency, url: device.officialUrl, checkedAt: device.lastUpdated }];
  }
}

export class CatalogReviewProvider implements ReviewProvider {
  async getProfessionalReviews(deviceId: string, context: ProviderContext) { void context; return professionalReviews.filter((review) => review.deviceId === deviceId); }
}

export class CatalogBenchmarkProvider implements BenchmarkProvider {
  async getBenchmarks(deviceId: string, context: ProviderContext) { void deviceId; void context; return []; }
}

function validateAIResult(value: unknown, allowedSourceIds: string[]): AIResult {
  if (!value || typeof value !== "object") throw new Error("AI response must be an object");
  const candidate = value as Partial<AIResult>;
  const arrays: (keyof AIResult)[] = ["pros", "cons", "best_for", "not_recommended_for", "used_source_ids", "missing_information", "conflicting_information"];
  for (const key of arrays) if (!Array.isArray(candidate[key])) throw new Error(`AI field ${key} must be an array`);
  if (typeof candidate.summary !== "string" || typeof candidate.confidence !== "number") throw new Error("AI response has invalid scalar fields");
  if ((candidate.used_source_ids ?? []).some((id) => !allowedSourceIds.includes(id))) throw new Error("AI referenced an unknown source");
  return candidate as AIResult;
}

export class OpenAICompatibleProvider implements AIProvider {
  async createStructuredSummary(input: Record<string, unknown>, context: ProviderContext): Promise<AIResult> {
    const endpoint = serverEnvironment("AI_API_URL");
    const apiKey = serverEnvironment("AI_API_KEY");
    const allowedSourceIds = Array.isArray(input.sourceIds) ? input.sourceIds.filter((item): item is string => typeof item === "string") : [];
    if (!endpoint || !apiKey) return evidenceFallback(input, allowedSourceIds);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "x-request-id": context.requestId },
      body: JSON.stringify({
        model: serverEnvironment("AI_MODEL") ?? "provider-default",
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          { role: "system", content: "Return only the requested JSON shape. Use only supplied verified facts. Never add specifications, prices, dates, benchmark scores, or source IDs." },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
      signal: context.signal,
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI provider returned no content");
    return validateAIResult(JSON.parse(text), allowedSourceIds);
  }
}

function evidenceFallback(input: Record<string, unknown>, sourceIds: string[]): AIResult {
  const name = typeof input.name === "string" ? input.name : "This device";
  return {
    summary: `${name} is presented from sourced catalog fields. Connect AI_API_URL and AI_API_KEY for a provider-generated evidence summary.`,
    pros: [], cons: [], best_for: [], not_recommended_for: [], confidence: 0.55,
    used_source_ids: sourceIds,
    missing_information: ["Live AI provider not configured"],
    conflicting_information: [],
  };
}

export const providers = {
  specifications: new CatalogSpecificationsProvider(),
  images: new CatalogImageProvider(),
  pricing: new CatalogPricingProvider(),
  reviews: new CatalogReviewProvider(),
  benchmarks: new CatalogBenchmarkProvider(),
  ai: new OpenAICompatibleProvider(),
};
