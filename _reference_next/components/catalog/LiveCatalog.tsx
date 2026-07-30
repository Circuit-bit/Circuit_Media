"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CatalogDevice } from "../../lib/providers/mobileapi";
import type { Device, DeviceCategory } from "../../lib/types";

type CatalogMeta = {
  count: number;
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  provider: "live" | "gsmarena" | "mobileapi" | "catalog" | "fixture";
};

type CatalogResponse = {
  data: Array<CatalogDevice | Device>;
  meta: CatalogMeta;
};

function isLiveDevice(device: CatalogDevice | Device): device is CatalogDevice {
  return typeof device.id === "number";
}

function fixturePath(device: Device) {
  const section = device.category === "phone" ? "phones" : device.category === "tablet" ? "tablets" : "watches";
  return `/${section}/${device.slug}`;
}

function DevicePhoto({ src, alt, category }: { src: string | null; alt: string; category: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`catalog-photo-fallback ${category}`} aria-hidden="true"><span>{category === "tablet" ? "▭" : category === "watch" ? "◉" : "▯"}</span></div>;
  // Provider images are served from HTTPS URLs returned by MobileAPI; no credential is placed in the URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="catalog-photo" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function CatalogCard({ device }: { device: CatalogDevice | Device }) {
  const live = isLiveDevice(device);
  const brand = device.brand;
  const model = device.model;
  const href = live ? `/catalog/${device.id}` : fixturePath(device);
  const imageUrl = live ? device.imageUrl : device.image.url;
  const release = live ? device.releaseDate : new Date(device.releaseDate).getFullYear().toString();
  const summary = live ? device.description : device.summary;
  const firstFact = live ? device.storage : device.startingPrice ? `From $${device.startingPrice.toLocaleString()}` : "Price not confirmed";
  const secondFact = live ? device.battery : release;

  return (
    <article className="device-card catalog-device-card">
      <Link href={href} className="device-card-visual" aria-label={`Open ${brand} ${model}`}>
        <DevicePhoto src={imageUrl} alt={`${brand} ${model}`} category={device.category} />
      </Link>
      <div className="device-card-body">
        <div className="eyebrow-row"><span>{brand}</span><strong>{live ? "API" : device.score > 0 ? device.score.toFixed(1) : "—"}</strong></div>
        <h3><Link href={href}>{model}</Link></h3>
        <p>{summary}</p>
        <div className="device-card-meta"><span>{firstFact}</span><span>{secondFact || "Not confirmed"}</span></div>
        <div className="card-actions"><Link className="text-link" href={href}>Photos & specs <span>↗</span></Link></div>
      </div>
    </article>
  );
}

export function LiveCatalog({
  query = "",
  category = "all",
  manufacturer = "",
  maxPrice = "",
  sort = "",
  title = "Live device catalog",
}: {
  query?: string;
  category?: DeviceCategory | "all";
  manufacturer?: string;
  maxPrice?: string;
  sort?: string;
  title?: string;
}) {
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestUrl = useMemo(() => {
    const parameters = new URLSearchParams({ page: String(page), limit: "24" });
    if (category !== "all") parameters.set("category", category);
    if (manufacturer && manufacturer.toLowerCase() !== "all") parameters.set("brand", manufacturer);
    if (query.trim() || maxPrice || sort) {
      if (query.trim()) parameters.set("q", query.trim());
      if (maxPrice) parameters.set("maxPrice", maxPrice);
      if (sort) parameters.set("sort", sort);
      return `/api/search?${parameters}`;
    }
    return `/api/devices?${parameters}`;
  }, [category, manufacturer, page, query, maxPrice, sort]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(requestUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
        return response.json() as Promise<CatalogResponse>;
      })
      .then((data) => setPayload(data))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("The live catalog is temporarily unavailable. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestUrl, retry]);

  const meta = payload?.meta;
  const providerLabel = meta?.provider === "live" || meta?.provider === "gsmarena" ? "Live device catalog" : meta?.provider === "mobileapi" ? "Live device catalog" : "Device catalog";
  return (
    <div className="live-catalog">
      <div className="live-catalog-heading">
        <div><span className="section-kicker">{providerLabel}</span><h2>{title}</h2></div>
        <div className="catalog-count"><strong>{meta ? meta.total.toLocaleString() : "—"}</strong><span>{query ? "matching devices" : "devices available"}</span></div>
      </div>
      <p className="catalog-disclosure">Photos and specifications below come from the live device catalog; regional variants may differ.</p>
      {loading && <div className="catalog-loading" role="status"><span />Loading devices…</div>}
      {error && <div className="catalog-error" role="alert"><strong>Catalog connection interrupted</strong><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(""); setRetry((current) => current + 1); }}>Try again</button></div>}
      {!loading && !error && payload && (
        payload.data.length ? <div className="device-grid three">{payload.data.map((device) => <CatalogCard key={`${meta?.provider}-${device.id}`} device={device} />)}</div> :
          <div className="empty-state"><span>⌕</span><h2>No matching devices</h2><p>Try a broader model name or remove a filter. Provider results are shown as supplied.</p><Link className="outline-button" href="/search">Reset search</Link></div>
      )}
      {meta && meta.totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="Catalog pages">
          <button type="button" disabled={!meta.hasPrevious || loading} onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }}>← Previous</button>
          <span>Page <strong>{meta.page.toLocaleString()}</strong> of {meta.totalPages.toLocaleString()}</span>
          <button type="button" disabled={!meta.hasNext || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next →</button>
        </nav>
      )}
    </div>
  );
}
