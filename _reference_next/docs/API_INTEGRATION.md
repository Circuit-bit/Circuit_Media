# API integration guide

## Adapter strategy

Third-party responses must enter through the interfaces in `lib/providers.ts`. UI components and public API routes consume normalized `Device` records and never access vendor-specific fields.

The live catalog is implemented in `lib/mobileapi.ts`. It authenticates with a server-only bearer credential, caps list pages at the provider's 30-record maximum, normalizes provider data, and leaves the curated editorial fixtures available as a graceful fallback. Search uses the provider's name search; category and manufacturer browsing use the dedicated provider endpoints.

For each live provider:

1. Fetch from a server route or scheduled worker with the key stored in environment variables.
2. Store the untouched payload and a payload hash for auditing.
3. Validate the response with a runtime schema before normalization.
4. Resolve brand, model number, region, RAM and storage into a unique variant.
5. Save every normalized field with `sourceId`, provider, source URL and `lastVerifiedAt`.
6. Mark disagreements `CONFLICTING`; never silently pick one value.
7. Cache stable specifications longer than price and availability.

## Images

`ProductImageProvider` must return the actual device image plus source page, provider, license, color/variant match and verification date. Reject images when the model, camera layout, controls, branding or color cannot be matched confidently. Never fall back to generated imagery.

MobileAPI galleries are exposed without base64 payloads through `GET /api/catalog/[id]/images`. The returned HTTPS image URLs contain no API key. Provider `is_official` flags are displayed as provider claims, not as Circuit Media verification.

## AI

The included provider expects an OpenAI-compatible chat completion endpoint and structured JSON. Only verified fields and source IDs are supplied. Output is rejected if it cites an unknown source ID. Production should add a second validation pass that extracts any numeric claims and confirms each against the supplied facts.

Required result shape:

```json
{
  "summary": "",
  "pros": [],
  "cons": [],
  "best_for": [],
  "not_recommended_for": [],
  "confidence": 0,
  "used_source_ids": [],
  "missing_information": [],
  "conflicting_information": []
}
```

## Public endpoints

- `GET /api/devices`
- `GET /api/devices?page=&limit=&category=&brand=`
- `GET /api/devices/[slug]`
- `GET /api/search?q=&category=&brand=&maxPrice=`
- `GET /api/catalog/[id]`
- `GET /api/catalog/[id]/images`
- `GET /api/brands`
- `GET /api/categories`
- `POST /api/compare`
- `GET /api/prices/[deviceId]`
- `GET /api/reviews/[deviceId]`
- `POST /api/user-reviews`
- `POST /api/ai/summarize`
- `POST /api/ai/compare`

Admin endpoints require `Authorization: Bearer ADMIN_API_TOKEN`:

- `POST /api/admin/import`
- `POST /api/admin/verify`

## Scheduling

Recommended refresh windows: specifications weekly, upcoming devices daily, product images after a variant change, prices every 15–60 minutes, availability hourly, and review feeds daily. Backoff on 429/5xx responses and preserve the last verified record.
