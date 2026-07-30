import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveCatalog } from "../../../components/catalog/LiveCatalog";
import { findGsmBrand, listGsmBrands } from "../../../lib/live/gsmarena";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findGsmBrand(decodeURIComponent(slug));
  if (!brand) return { title: "Brand not found" };
  return {
    title: `${brand.name} phones, tablets and watches`,
    description: `Browse all ${brand.deviceCount.toLocaleString()} ${brand.name} devices with live specifications and photos.`,
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const brand = await findGsmBrand(decoded);
  if (!brand) notFound();
  const all = await listGsmBrands();
  const neighbors = all.filter((item) => item.brandSlug !== brand.brandSlug).slice(0, 8);

  return (
    <main>
      <section className="category-hero category-phone">
        <div className="shell">
          <span className="section-kicker lime">Live brand catalog</span>
          <h1>{brand.name}<mark>.</mark></h1>
          <p>All {brand.deviceCount.toLocaleString()} devices listed under {brand.name} — phones, tablets and wearables, with live specs and photos.</p>
          <div className="category-meta">
            <span>{brand.deviceCount.toLocaleString()} devices</span>
            <span>Paginated live</span>
            <Link href="/brands">All brands</Link>
          </div>
        </div>
      </section>
      <section className="live-catalog-section shell">
        <LiveCatalog manufacturer={brand.name} title={`All ${brand.name} devices`} />
      </section>
      <section className="shell" style={{ paddingBottom: 90 }}>
        <div className="section-heading"><div><span className="section-kicker">More brands</span><h2>Also browsing</h2></div></div>
        <div className="chip-row wrap" style={{ marginTop: 18 }}>
          {neighbors.map((item) => (
            <Link key={item.brandSlug} href={`/brands/${encodeURIComponent(item.brandSlug)}`} className="chip">{item.name}</Link>
          ))}
          <Link href="/brands" className="chip">View all brands</Link>
        </div>
      </section>
    </main>
  );
}
