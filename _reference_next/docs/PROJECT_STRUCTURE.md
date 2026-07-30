# Project structure

Circuit Media is a Next.js App Router site. Use this map when fixing bugs or adding features.

```
app/                 # Routes (pages) and API handlers
  api/               # REST endpoints (/api/brands, /api/search, /api/recommend, …)
  brands/            # Brand directory + brand catalog pages
  phones|tablets|watches/  # Category browse + product pages
  recommend/         # Use-case recommender UI
  search/ compare/ reviews/ admin/
components/          # Shared React UI (Header, Footer, cards, wizards)
lib/                 # Domain logic (keep business rules out of components)
  site-config.ts     # Brand name, logo, nav, contact
  gsmarena.ts        # Live specs API client + resilient search
  live-catalog.ts    # Live list/detail orchestration + local merge
  catalog.ts         # Seed JSON → Device model
  specs.ts           # Spec parsing / feature extraction
  search.ts          # Local analysis-cache search
  recommend.ts       # Explainable ranking engine
  reviews.ts         # Lab-style review generation
  providers.ts       # Optional external provider contracts
  data/devices.json  # Seeded analysis cache (from scripts/seed.mjs)
public/              # Static assets (logo, OG, hero)
scripts/             # Offline tools (seed.mjs)
tests/               # Worker HTML / API smoke tests
docs/                # Deployment, API notes, this map
prisma/              # Future DB schema (not required at runtime)
worker/              # Cloudflare worker entry
```

## Where to fix common issues

| Problem | Start here |
|---------|------------|
| Branding / site name / logo | `lib/site-config.ts`, `components/Header.tsx`, `components/Footer.tsx` |
| Search misses devices | `lib/gsmarena.ts` (`searchGsmDevices`), `lib/live-catalog.ts`, `lib/search.ts` |
| Product page / specs / photos | `components/ProductPage.tsx`, `lib/live-catalog.ts`, `lib/catalog.ts` |
| Recommendations | `lib/recommend.ts`, `app/api/recommend`, `components/RecommendClient.tsx` |
| API routes | `app/api/**/route.ts` |
| Seed / offline cache | `scripts/seed.mjs`, `lib/data/devices.json` |

## Conventions

- Prefer live catalog for browse/search; use the seed cache for scoring and offline fallback.
- Keep provider credentials server-side (`.env`); never commit secrets.
- User-facing copy should say **Circuit Media**, not upstream data-source brands.
