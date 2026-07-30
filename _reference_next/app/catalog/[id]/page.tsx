/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMobileDevice, getMobileDeviceImages, MobileApiError } from "../../../lib/providers/mobileapi";
import type { CatalogDevice, CatalogImage } from "../../../lib/providers/mobileapi";

export const metadata: Metadata = {
  title: "Live device photos and specifications",
  description: "Provider-supplied device photos and detailed technical specifications from the Circuit Media live catalog.",
};

export const dynamic = "force-dynamic";

export default async function CatalogDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let device: CatalogDevice;
  try {
    device = await getMobileDevice(id);
  } catch (error) {
    if (error instanceof MobileApiError && (error.status === 400 || error.status === 404)) notFound();
    throw error;
  }

  let images: CatalogImage[] = [];
  try {
    images = await getMobileDeviceImages(id);
  } catch {
    images = [];
  }
  const heroImage = images.find((image) => image.type === "main") ?? images[0];
  const imageUrl = heroImage?.url ?? device.imageUrl;
  const checkedAt = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const categoryLabel = device.category === "watch" ? "Wearable" : device.category.charAt(0).toUpperCase() + device.category.slice(1);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${device.brand} ${device.model}`,
    brand: { "@type": "Brand", name: device.brand },
    model: device.modelNumbers === "Not confirmed" ? device.model : device.modelNumbers,
    description: device.description,
    ...(imageUrl ? { image: imageUrl } : {}),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />
      <div className="breadcrumbs shell"><Link href="/">Home</Link><span>/</span><Link href="/search">Live catalog</Link><span>/</span><strong>{device.model}</strong></div>
      <section className="product-hero shell live-product-hero">
        <div className="product-visual-panel live-product-visual">
          {imageUrl ? <img src={imageUrl} alt={`${device.brand} ${device.model}`} /> : <div className={`catalog-photo-fallback ${device.category}`}><span>▯</span></div>}
          <div className="image-integrity"><strong>{images.length ? `${images.length} provider photo${images.length === 1 ? "" : "s"} available` : "Provider photo status unknown"}</strong><span>Images are catalog-provider supplied; licensing and exact variant matching should be confirmed before reuse.</span>{imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer">Open image source ↗</a>}</div>
        </div>
        <div className="product-intro">
          <div className="product-badges"><span className="provider-chip">MobileAPI record</span><span>Checked {checkedAt}</span></div>
          <span className="section-kicker">{device.brand}</span><h1>{device.model}</h1><p>{device.description}</p>
          <div className="live-highlight-grid"><div><span>Display</span><strong>{device.display}</strong></div><div><span>Storage</span><strong>{device.storage}</strong></div><div><span>Camera</span><strong>{device.camera}</strong></div><div><span>Battery</span><strong>{device.battery}</strong></div></div>
          <div className="product-actions"><Link className="lime-button" href={`/search?q=${encodeURIComponent(device.model)}`}>Find related models ↗</Link><a className="outline-button" href="https://mobileapi.dev/docs/" target="_blank" rel="noreferrer">Provider documentation</a></div>
          <div className="variant-row"><span>Record</span><b>{categoryLabel}</b><b>{device.releaseDate}</b>{device.colors.slice(0, 4).map((color) => <b key={color}>{color}</b>)}</div>
        </div>
      </section>
      <nav className="product-subnav"><div className="shell"><a href="#specs">Specifications</a><a href="#sources">Source & status</a></div></nav>
      <section id="specs" className="spec-section shell">
        <div className="spec-heading"><span className="section-kicker">Provider-supplied facts</span><h2>Full specifications</h2><p>Fields are normalized from MobileAPI. They remain visibly provider-supplied until independently checked against manufacturer documentation.</p></div>
        <div className="spec-groups">{device.specifications.map((group, index) => <details key={group.name} open={index === 0}><summary><span>{group.name}</span><b>{group.items.length} fields</b></summary><div>{group.items.map((item) => <div className="spec-row" key={`${group.name}-${item.label}`}><span>{item.label}</span><strong>{item.value}</strong><a href="https://mobileapi.dev/docs/" target="_blank" rel="noreferrer" title="Open provider documentation">Provider</a></div>)}</div></details>)}</div>
      </section>
      <section id="sources" className="source-section shell"><div className="source-intro"><span className="section-kicker">Transparency</span><h2>Source & verification</h2><p>This record and its photos were supplied by MobileAPI. “Provider marks official” describes the provider flag; it is not an independent Circuit Media or manufacturer verification.</p></div><div className="source-list"><a href="https://mobileapi.dev/docs/" target="_blank" rel="noreferrer"><span>↗</span><div><strong>MobileAPI device catalog</strong><small>api.mobileapi.dev · authenticated server request</small></div><time>{checkedAt}</time><b>↗</b></a><Link href={`/api/catalog/${device.id}`}><span>API</span><div><strong>Normalized Circuit Media record</strong><small>/api/catalog/{device.id}</small></div><time>Live</time><b>↗</b></Link></div></section>
    </main>
  );
}
