# Deployment guide

Circuit Media is a vinext / Cloudflare Workers app with live API routes. **GitHub Pages cannot host the full app** (static-only; no Worker/API runtime). Host production on **Cloudflare Workers**, with builds triggered from this GitHub repo.

For a static preview only, use the **`Circuit_Media_Review/`** folder and the **Deploy GitHub Pages demo** workflow (see below).

Live URL: `https://circuit-media-review.com` (Worker name `circuit-media`; `*.workers.dev` remains as a fallback).

## Fast path: GitHub → Cloudflare

### 1. Push this repo to GitHub

Repo: https://github.com/Circuit-bit/Circuit_Media

### 2. Create a Cloudflare API token

1. Open [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Create Token → use **Edit Cloudflare Workers** template (or custom with Workers Scripts:Edit, Account:Read).
3. Copy the token and your **Account ID** (Workers & Pages overview sidebar).

### 3. Add GitHub Actions secrets

In the repo: **Settings → Secrets and variables → Actions**

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### 4. Run the deploy

Push to `main`, or open **Actions → Deploy Cloudflare Worker → Run workflow**.

The workflow runs `vinext deploy --name circuit-media`.

Custom domains `circuit-media-review.com` and `www.circuit-media-review.com` are declared in `wrangler.jsonc`. The domain must be on the same Cloudflare account.

### Optional: local deploy

```bash
npx wrangler login   # one-time browser auth
npm run deploy
```

## Static GitHub Pages demo (`Circuit_Media_Review`)

Folder: [`Circuit_Media_Review/`](../Circuit_Media_Review/) — HTML/CSS/JS + seeded device snapshot.

Repo: [Circuit-bit/Circuit_Media](https://github.com/Circuit-bit/Circuit_Media)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Push changes under `Circuit_Media_Review/`, or run **Actions → Deploy GitHub Pages demo**
3. Demo URL: **https://circuit-bit.github.io/Circuit_Media/**

## Required production services (later)

1. PostgreSQL 15+ or Supabase (if leaving the JSON cache).
2. Licensed specification / image / pricing providers as needed.
3. Redis-compatible cache and rate limiter for high traffic.
4. Error monitoring and structured logs.

## Release checklist

1. Copy `.env.example` values into Cloudflare Worker secrets / vars (never commit `.env.local`).
2. Keep `NEXT_PUBLIC_SITE_URL=https://circuit-media-review.com`.
3. Optionally set `SPECS_API_URL` for a private specs API.
4. Run `npm run build` / `npm test` locally when changing APIs.
5. Deploy via GitHub Actions or `npm run deploy`.
6. Verify homepage, search, compare, recommend, sitemap, and robots.

Never commit API keys. Rotate any credential that is accidentally exposed.
