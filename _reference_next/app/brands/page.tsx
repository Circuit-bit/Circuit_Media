import type { Metadata } from "next";
import Link from "next/link";
import { liveBrands } from "../../lib/live/live-catalog";

export const metadata: Metadata = {
  title: "All smartphone brands",
  description: "Browse every smartphone, tablet and wearable brand with live specifications and photos.",
};

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { brands, totalDevices } = await liveBrands();
  return (
    <main>
      <section className="search-hero">
        <div className="shell">
          <span className="section-kicker lime">Live catalog</span>
          <h1>Every brand.</h1>
          <p style={{ color: "rgba(255,255,255,.8)", maxWidth: 640, marginTop: 18, lineHeight: 1.55 }}>
            {brands.length} brands and {totalDevices.toLocaleString()} devices, in the live catalog. Open any brand to browse its full catalog.
          </p>
        </div>
      </section>
      <section className="shell" style={{ padding: "50px 0 110px" }}>
        <div className="brand-directory">
          {brands.map((brand) => (
            <Link key={brand.brandSlug} href={`/brands/${encodeURIComponent(brand.brandSlug)}`} className="brand-tile">
              <strong>{brand.name}</strong>
              <span>{brand.deviceCount.toLocaleString()} devices</span>
              <b>↗</b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
