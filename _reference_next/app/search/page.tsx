import type { Metadata } from "next";
import Link from "next/link";
import { LiveCatalog } from "../../components/catalog/LiveCatalog";
import { SearchBox } from "../../components/catalog/SearchBox";
import { brands as cachedBrands } from "../../lib/seed/catalog";
import { liveBrands } from "../../lib/live/live-catalog";
import type { DeviceCategory } from "../../lib/types";

export const metadata: Metadata = {
  title: "Search the live device catalog",
  description: "Search every phone, tablet and smartwatch by model, brand, budget, or specification, with full live spec sheets and real photos.",
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const category = (params.category as DeviceCategory | "all") ?? "all";
  const { brands: live } = await liveBrands();
  const brands = live.length ? live.map((brand) => brand.name) : cachedBrands;
  return (
    <main>
      <section className="search-hero"><div className="shell"><span className="section-kicker lime">Live catalog search</span><h1>Find any device.</h1><SearchBox compact initial={params.q ?? ""} /></div></section>
      <section className="search-layout shell">
        <aside>
          <form action="/search">
            <input type="hidden" name="q" value={params.q ?? ""} />
            <label>Category<select name="category" defaultValue={category}><option value="all">All devices</option><option value="phone">Smartphones</option><option value="tablet">Tablets</option><option value="watch">Smartwatches</option></select></label>
            <label>Brand<select name="brand" defaultValue={params.brand ?? ""}><option value="">All brands</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
            <label>Max price<select name="maxPrice" defaultValue={params.maxPrice ?? ""}><option value="">Any price</option><option value="200">$200</option><option value="350">$350</option><option value="500">$500</option><option value="750">$750</option><option value="1000">$1,000</option><option value="1500">$1,500</option></select></label>
            <label>Sort by<select name="sort" defaultValue={params.sort ?? "popular"}><option value="popular">Popularity</option><option value="score">Analysis score</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option></select></label>
            <button type="submit">Apply filters</button>
            <Link href="/search">Clear all</Link>
          </form>
          <div className="search-tip"><strong>Live catalog search</strong><p>Free-text search hits the live catalog. Spec filters (budget, sort) also use the local analysis cache. Or browse <Link href="/brands">every brand</Link> / try the <Link href="/recommend">recommendation engine</Link>.</p></div>
        </aside>
        <div className="search-results"><LiveCatalog query={params.q ?? ""} category={category} manufacturer={params.brand ?? ""} maxPrice={params.maxPrice ?? ""} sort={params.sort ?? ""} title={params.q ? `Results for “${params.q}”` : "Browse every device"} /></div>
      </section>
    </main>
  );
}
