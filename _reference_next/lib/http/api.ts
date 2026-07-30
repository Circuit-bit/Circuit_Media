import { serverEnvironment } from "./runtime-env";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function log(event: string, data: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", event, at: new Date().toISOString(), ...data }));
}

export function rateLimit(request: Request, limit = 30, windowMs = 60_000) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${forwarded ?? "local"}:${new URL(request.url).pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  return Response.json({ error: "Too many requests", retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }, { status: 429 });
}

export async function safeJson<T>(request: Request): Promise<T | null> {
  try { return await request.json() as T; } catch { return null; }
}

export function sanitizeText(input: unknown, maxLength = 2000) {
  if (typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function requireAdmin(request: Request) {
  const configured = serverEnvironment("ADMIN_API_TOKEN");
  if (!configured) return Response.json({ error: "Admin API is disabled until ADMIN_API_TOKEN is configured" }, { status: 503 });
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supplied !== configured) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
