import type { Metadata } from "next";
import Link from "next/link";
import { LiveCatalog } from "../../components/catalog/LiveCatalog";
import { SearchBox } from "../../components/catalog/SearchBox";
import { liveBrands } from "../../lib/live/live-catalog";
import type { DeviceCategory } from "../../lib/types";

export const metadata: Metadata = {
  title: "Devices — phones, tablets & watches",
  description: "Browse the live Circuit Media catalog of phones, tablets, and smartwatches with full specs and photos.",
};

export const dynamic = "force-dynamic";

const FILTERS: Array<{
  key: DeviceCategory | "all";
  label: string;
  glyph: string;
  glyphClass: string;
  href: string;
}> = [
  { key: "all", label: "All devices", glyph: "▦", glyphClass: "phone-glyph", href: "/devices" },
  { key: "phone", label: "Phones", glyph: "▯", glyphClass: "phone-glyph", href: "/devices?category=phone" },
  { key: "tablet", label: "Tablets", glyph: "▭", glyphClass: "tablet-glyph", href: "/devices?category=tablet" },
  { key: "watch", label: "Watches", glyph: "◉", glyphClass: "watch-glyph", href: "/devices?category=watch" },
];

const COPY: Record<DeviceCategory | "all", { title: string; kicker: string; description: string; catalogTitle: string }> = {
  all: {
    title: "Devices",
    kicker: "Full live catalog",
    description: "Phones, tablets, and watches in one place — filter by type, then open any model for live specs and photos.",
    catalogTitle: "All devices",
  },
  phone: {
    title: "Phones",
    kicker: "Pocket computers",
    description: "Flagship cameras, battery-first bargains, and everything between — compared with evidence.",
    catalogTitle: "All smartphones",
  },
  tablet: {
    title: "Tablets",
    kicker: "Big-screen shortlist",
    description: "Creative canvases, work companions, and family screens with live specs and photos.",
    catalogTitle: "All tablets",
  },
  watch: {
    title: "Watches",
    kicker: "Wearable intelligence",
    description: "Health sensors, fitness tools, battery life and compatibility — verified side by side.",
    catalogTitle: "All smartwatches",
  },
};

function parseCategory(value: string | undefined): DeviceCategory | "all" {
  if (value === "phone" || value === "tablet" || value === "watch") return value;
  return "all";
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const data = COPY[category];
  const { brands, totalDevices } = await liveBrands();

  return (
    <main>
      <section className={`category-hero category-${category === "all" ? "phone" : category}`}>
        <div className="shell">
          <span className="section-kicker lime">{data.kicker}</span>
          <h1>{data.title}<mark>.</mark></h1>
          <p>{data.description}</p>
          <SearchBox compact />
          <div className="category-meta">
            <span>{totalDevices.toLocaleString()} live devices</span>
            <span>{brands.length} brands</span>
            <Link href="/brands">Browse by brand</Link>
          </div>
        </div>
      </section>

      <section className="device-type-bar shell" aria-label="Device type">
        <div className="device-type-switch" role="tablist" aria-label="Filter by device type">
          {FILTERS.map((filter) => {
            const active = filter.key === category;
            return (
              <Link
                key={filter.key}
                href={filter.href}
                role="tab"
                aria-selected={active}
                className={active ? "is-active" : undefined}
              >
                <span className={`category-glyph ${filter.glyphClass}`} aria-hidden="true">{filter.glyph}</span>
                <strong>{filter.label}</strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="live-catalog-section shell">
        <LiveCatalog category={category} title={data.catalogTitle} />
      </section>
    </main>
  );
}
