import type { Metadata } from "next";
import Link from "next/link";
import { DeviceCard } from "../device/DeviceCard";
import { LiveCatalog } from "./LiveCatalog";
import { SearchBox } from "./SearchBox";
import { getByCategory } from "../../lib/seed/catalog";
import { liveBrands } from "../../lib/live/live-catalog";
import type { DeviceCategory } from "../../lib/types";

const copy = {
  phone: { title: "Smartphones", kicker: "Pocket computers", description: "Flagship cameras, battery-first bargains, and everything between — compared with evidence." },
  tablet: { title: "Tablets", kicker: "Big-screen shortlist", description: "Creative canvases, work companions, and family screens with live specs and photos." },
  watch: { title: "Smartwatches", kicker: "Wearable intelligence", description: "Health sensors, fitness tools, battery life and compatibility — verified side by side." },
};

export async function CategoryPage({ category }: { category: DeviceCategory }) {
  const data = copy[category];
  const curated = getByCategory(category).slice().sort((a, b) => b.score - a.score).slice(0, 6);
  const { brands, totalDevices } = await liveBrands();
  return (
    <main>
      <section className={`category-hero category-${category}`}>
        <div className="shell"><span className="section-kicker lime">{data.kicker}</span><h1>{data.title}<mark>.</mark></h1><p>{data.description}</p><SearchBox compact /><div className="category-meta"><span>{totalDevices.toLocaleString()} live devices</span><span>{brands.length} brands</span><Link href="/brands">Browse by brand</Link></div></div>
      </section>
      {curated.length > 0 && (
        <section className="catalog shell curated-catalog">
          <div className="catalog-toolbar"><div><strong>Analyzed shortlist</strong><span>Highest scored {data.title.toLowerCase()} in our analysis cache</span></div><div><Link href={`/recommend?category=${category}`}>Get a recommendation</Link><Link href="/compare">Open compare</Link></div></div>
          <div className="device-grid three">{curated.map((device) => <DeviceCard key={device.id} device={device} featured />)}</div>
        </section>
      )}
      <section className="live-catalog-section shell"><LiveCatalog category={category} title={`All ${data.title.toLowerCase()}`} /></section>
      <section className="category-explainer shell"><div><span className="section-kicker">How it works</span><h2>Live data. Explainable scores.</h2></div><p>Device lists and full specification sheets are fetched live from the device catalog. Analysis scores use published component weights over those sourced fields. Use the recommendation engine to re-weight them around your own use case.</p><Link className="outline-button" href="/methodology">Read methodology ↗</Link></section>
    </main>
  );
}

export function categoryMetadata(category: DeviceCategory): Metadata {
  const data = copy[category];
  return { title: `${data.title} — live specs and photos`, description: data.description };
}
