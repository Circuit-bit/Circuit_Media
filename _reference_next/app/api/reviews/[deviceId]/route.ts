import { providers } from "../../../../lib/providers/providers";
import { rateLimit, requestId } from "../../../../lib/http/api";
export async function GET(request: Request, { params }: { params: Promise<{ deviceId: string }> }) { const limited = rateLimit(request); if (limited) return limited; const id = requestId(request); const data = await providers.reviews.getProfessionalReviews((await params).deviceId, { requestId: id, signal: request.signal }); return Response.json({ data, meta: { requestId: id } }); }
