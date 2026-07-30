# Production credential and operations TODO

- [x] Seed a real device catalog (specs, photos, prices) with no API key required (`scripts/seed.mjs`).
- [x] Build the deterministic use-case recommendation engine and `/recommend` wizard.
- [x] Serve real product photos with source attribution across cards, product pages, and compare.
- [ ] Re-run `node scripts/seed.mjs` periodically (or on a schedule) to pick up new releases and retry transient failures.
- [ ] Optionally deploy a private instance of the specs API and set `SPECS_API_URL`.
- [ ] Confirm image republication rights/attribution requirements for the intended production use.
- [ ] Add a pricing/retailer provider and disclosure policy for live offers.
- [ ] Add professional review and benchmark feeds with syndication rights.
- [ ] Provision PostgreSQL/Supabase and apply the Prisma migration if moving off the JSON dataset.
- [ ] Replace the in-memory limiter with Redis/Upstash.
- [ ] Configure `AI_API_URL`/`AI_API_KEY` to enable LLM narratives on recommendations and summaries.
- [ ] Configure admin token rotation, spam protection and moderation storage.
- [ ] Add production email/contact details in `lib/site-config.ts`.
- [ ] Configure error monitoring, alerting, data retention and scheduled refresh jobs.
- [ ] Run browser-based accessibility and end-to-end tests in CI.
- [ ] Monitor upstream framework security advisories during every release and remove temporary dependency overrides when no longer needed.
