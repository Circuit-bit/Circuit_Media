import type { Metadata } from "next";
import { RecommendClient, type MustHaveMeta, type ScenarioMeta } from "../../components/catalog/RecommendClient";
import { brands, devices } from "../../lib/seed/catalog";
import { liveBrands } from "../../lib/live/live-catalog";
import { MUST_HAVES, SCENARIOS } from "../../lib/seed/recommend";
import type { DeviceCategory } from "../../lib/types";

export const metadata: Metadata = {
  title: "AI-powered device recommendations",
  description: "Tell us your use case and budget and get ranked phone, tablet, and smartwatch recommendations backed by sourced specification evidence.",
};

export const dynamic = "force-dynamic";

export default async function RecommendPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const initialCategory = (["phone", "tablet", "watch"].includes(params.category ?? "") ? params.category : "all") as DeviceCategory | "all";
  const scenarios: ScenarioMeta[] = SCENARIOS.map(({ id, label, description, categories }) => ({ id, label, description, categories }));
  const mustHaves: MustHaveMeta[] = MUST_HAVES.map(({ id, label, categories }) => ({ id, label, categories }));
  const { totalDevices, brands: liveBrandList } = await liveBrands();
  const brandNames = liveBrandList.length ? liveBrandList.map((brand) => brand.name) : brands;
  return (
    <main>
      <section className="recommend-hero">
        <div className="shell">
          <span className="section-kicker lime">Decision engine</span>
          <h1>Your use case.<br /><mark>Our shortlist.</mark></h1>
          <p>Answer three questions and get ranked recommendations scored from live specifications across {totalDevices.toLocaleString()} live devices — with the exact evidence and weights behind every pick. Deep scoring currently analyzes {devices.length.toLocaleString()} fully cached records and expands as you browse.</p>
        </div>
      </section>
      <section className="recommend-workspace shell">
        <RecommendClient scenarios={scenarios} mustHaves={mustHaves} brands={brandNames} initialCategory={initialCategory} />
      </section>
    </main>
  );
}
