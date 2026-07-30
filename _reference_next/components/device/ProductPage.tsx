import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceCard } from "./DeviceCard";
import { DevicePhoto } from "./DevicePhoto";
import { devices, featuresOf, getDevice } from "../../lib/seed/catalog";
import { resolveLiveDevice } from "../../lib/live/live-catalog";
import { reviewForDevice } from "../../lib/seed/reviews";
import type { Device, DeviceCategory } from "../../lib/types";

export async function productMetadata(slug: string, expectedCategory: DeviceCategory): Promise<Metadata> {
  const device = await resolveLiveDevice(slug) ?? getDevice(slug);
  if (!device || (device.category !== expectedCategory && device.specifications.length > 0)) {
    // Allow list-only category mismatches only if we still have the record; otherwise 404 metadata.
    if (!device) return { title: "Device not found" };
  }
  if (!device) return { title: "Device not found" };
  return {
    title: `${device.brand} ${device.model} specs, photos and analysis`,
    description: device.summary,
    alternates: { canonical: `/${expectedCategory === "phone" ? "phones" : expectedCategory === "tablet" ? "tablets" : "watches"}/${device.slug}` },
  };
}

const SCORE_LABELS: Array<{ key: "performance" | "display" | "camera" | "battery" | "build"; label: string }> = [
  { key: "performance", label: "Performance" },
  { key: "display", label: "Display" },
  { key: "camera", label: "Camera" },
  { key: "battery", label: "Battery" },
  { key: "build", label: "Build" },
];

function relatedFor(device: Device): Device[] {
  return devices
    .filter((item) => item.category === device.category && item.id !== device.id)
    .sort((a, b) => (a.brand === device.brand ? -1 : 0) - (b.brand === device.brand ? -1 : 0) || Math.abs(a.score - device.score) - Math.abs(b.score - device.score))
    .slice(0, 3);
}

export async function ProductPage({ slug, expectedCategory }: { slug: string; expectedCategory: DeviceCategory }) {
  const device = await resolveLiveDevice(slug);
  if (!device) notFound();
  // Soft category redirect: if the live record is a different category, still render (catalog mixes tablets under phone brands).
  const features = featuresOf(device);
  const review = reviewForDevice(device.id);
  const related = relatedFor(device);
  const categoryPath = (device.category === "phone" ? "phones" : device.category === "tablet" ? "tablets" : "watches");
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: `${device.brand} ${device.model}`, brand: { "@type": "Brand", name: device.brand }, model: device.modelNumber,
    description: device.summary,
    ...(device.image.url ? { image: device.image.url } : {}),
    ...(device.startingPrice ? { offers: { "@type": "Offer", price: device.startingPrice, priceCurrency: device.currency, availability: "https://schema.org/InStock", url: device.officialUrl } } : {}),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />
      <div className="breadcrumbs shell"><Link href="/">Home</Link><span>/</span><Link href={`/${categoryPath}`}>{categoryPath}</Link><span>/</span><strong>{device.model}</strong></div>
      <section className="product-hero shell">
        <div className="product-visual-panel live-product-visual">
          <DevicePhoto src={device.image.url} alt={`${device.brand} ${device.model}`} category={device.category} accent={device.accent} className="product-hero-photo" />
          <div className="image-integrity"><strong>Official product photo</strong><span>Specifications and imagery checked {new Date(device.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</span><a href={device.sources[0].url} target="_blank" rel="noreferrer">Open source record ↗</a></div>
        </div>
        <div className="product-intro">
          <div className="product-badges"><span className="verified-chip">✓ Sourced</span><span>{device.availability}</span>{expectedCategory !== device.category && <span>Listed as {device.category}</span>}</div>
          <span className="section-kicker">{device.brand}</span>
          <h1>{device.model}</h1>
          <p>{device.summary}</p>
          <div className="score-price">
            <div><strong>{device.score > 0 ? device.score.toFixed(1) : "—"}</strong><span>Analysis score</span></div>
            <div><strong>{device.startingPrice ? `$${device.startingPrice.toLocaleString()}` : "Varies by region"}</strong><span>Listed price</span></div>
          </div>
          <div className="product-actions"><Link className="lime-button" href={`/compare?devices=${device.id}`}>Compare this device ↗</Link><Link className="outline-button" href={`/recommend?category=${device.category}`}>Find alternatives</Link></div>
          {device.variants.length > 0 && <div className="variant-row"><span>Variants</span>{device.variants.slice(0, 5).map((variant) => <b key={variant}>{variant}</b>)}</div>}
          {device.colors.length > 0 && <div className="variant-row"><span>Colors</span>{device.colors.slice(0, 6).map((color) => <b key={color}>{color}</b>)}</div>}
        </div>
      </section>
      <nav className="product-subnav"><div className="shell"><a href="#overview">Overview</a><a href="#specs">Specifications</a><a href="#sources">Sources</a></div></nav>
      <section id="overview" className="product-overview shell">
        <div className="ai-summary">
          <div className="ai-label"><span>AI</span><strong>Automated spec analysis</strong><small>Computed from the live specification record</small></div>
          <h2>Who is it for?</h2>
          <p>{device.summary}</p>
          <div className="best-for">{device.bestFor.map((item) => <span key={item}>{item}</span>)}</div>
          {device.componentScores && (
            <div className="score-bars">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key} className="score-bar-row">
                  <span>{label}</span>
                  <div className="score-bar-track"><i style={{ width: `${device.componentScores![key] * 10}%` }} /></div>
                  <b>{device.componentScores![key].toFixed(1)}</b>
                </div>
              ))}
            </div>
          )}
          {features?.chipset && <small>Platform: {features.chipset} · {features.os}</small>}
        </div>
        <div className="pros-cons">
          <div><span className="pros-icon">+</span><h3>Strengths</h3><ul>{(device.pros.length ? device.pros : ["Open the full specification table for sourced details"]).map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><span className="cons-icon">−</span><h3>Tradeoffs</h3><ul>{(device.cons.length ? device.cons : ["No notable tradeoffs detected yet"]).map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </section>
      <section id="specs" className="spec-section shell">
        <div className="spec-heading"><span className="section-kicker">Source-linked facts</span><h2>Full specifications</h2><p>Every field below is fetched live from the device catalog and shown as published.</p></div>
        {device.specifications.length ? (
          <div className="spec-groups">{device.specifications.map((group, index) => <details key={group.name} open={index < 2}><summary><span>{group.name}</span><b>{group.items.length} fields</b></summary><div>{group.items.map((item) => <div className="spec-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><a href={device.sources[0]?.url} target="_blank" rel="noreferrer" title="Open source">✓ Live</a></div>)}</div></details>)}</div>
        ) : (
          <div className="catalog-error"><strong>Specifications loading</strong><span>The live record did not return a full specification table for this device.</span></div>
        )}
      </section>
      <section id="reviews" className="product-reviews shell">
        <div><span className="section-kicker">Three separate voices</span><h2>Reviews, clearly labelled.</h2></div>
        <div className="review-type-grid">
          <article><span>Editorial</span><h3>{review?.title ?? "Review in progress"}</h3><p>{review?.excerpt ?? "This device has not been through the Circuit Media lab write-up yet; the automated spec analysis above covers its measured strengths."}</p>{review && <Link href={review.url}>Read the full review ↗</Link>}</article>
          <article><span>AI-assisted</span><h3>Evidence summary</h3><p>Scores and pros/cons on this page are computed deterministically from the live catalog fields — never invented.</p><Link href="/ai-disclosure">Read AI disclosure ↗</Link></article>
          <article><span>Community</span><h3>{device.reviewUrl ? "External review available" : "No external review linked"}</h3><p>{device.reviewUrl ? "An in-depth independent review is available for this device." : "User submissions are sanitized and moderated before publication."}</p>{device.reviewUrl && <a href={device.reviewUrl} target="_blank" rel="noreferrer">Open external review ↗</a>}</article>
        </div>
      </section>
      <section id="sources" className="source-section shell"><div className="source-intro"><span className="section-kicker">Audit trail</span><h2>Sources & verification</h2><p>Every specification on this page traces to the live catalog record below.</p></div><div className="source-list">{device.sources.map((source) => <a key={source.id} href={source.url}><span>✓</span><div><strong>{source.provider}</strong><small>Circuit Media catalog record</small></div><time>{new Date(source.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time><b>↗</b></a>)}</div></section>
      <section className="content-section shell related-section"><div className="section-heading"><div><span className="section-kicker">Alternatives</span><h2>Also worth a look</h2></div></div><div className="device-grid three">{related.map((item) => <DeviceCard key={item.id} device={item} />)}</div></section>
    </main>
  );
}
