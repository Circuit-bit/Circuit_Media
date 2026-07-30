# Circuit Media on GitHub Pages

Full client-side Circuit Media app for **https://circuit-bit.github.io/Circuit_Media/**

Includes browse, search, device detail, compare, and recommend over the seeded catalog (560 devices). Runs entirely in the browser — no Cloudflare Worker required.

## Local preview

```bash
npm run build:pages
npx --yes serve Circuit_Media_Review
```

Open the printed URL. Locally the app detects a non-`/Circuit_Media` base path automatically.

## Deploy

Push to `main` on [Circuit-bit/Circuit_Media](https://github.com/Circuit-bit/Circuit_Media), or run **Actions → Deploy GitHub Pages demo**.
