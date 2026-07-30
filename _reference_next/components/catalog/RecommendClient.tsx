"use client";

import Link from "next/link";
import { useState } from "react";
import type { Device, DeviceCategory } from "../../lib/types";
import { DevicePhoto } from "../device/DevicePhoto";

export type ScenarioMeta = {
  id: string;
  label: string;
  description: string;
  categories: DeviceCategory[];
};

export type MustHaveMeta = {
  id: string;
  label: string;
  categories: DeviceCategory[];
};

type Recommendation = {
  device: Device;
  score: number;
  reasons: string[];
  breakdown: Array<{ criterion: string; weight: number; score: number }>;
};

type ApiResult = {
  data: {
    scenario: ScenarioMeta;
    considered: number;
    total: number;
    recommendations: Recommendation[];
    narrative: string | null;
  };
};

const BUDGETS: Array<{ label: string; value: number | null }> = [
  { label: "Any budget", value: null },
  { label: "Under $200", value: 200 },
  { label: "Under $350", value: 350 },
  { label: "Under $500", value: 500 },
  { label: "Under $750", value: 750 },
  { label: "Under $1,000", value: 1000 },
  { label: "Under $1,500", value: 1500 },
];

const CATEGORY_LABELS: Array<{ id: DeviceCategory | "all"; label: string }> = [
  { id: "all", label: "Anything" },
  { id: "phone", label: "Smartphone" },
  { id: "tablet", label: "Tablet" },
  { id: "watch", label: "Smartwatch" },
];

function categoryPath(category: DeviceCategory) {
  return category === "phone" ? "phones" : category === "tablet" ? "tablets" : "watches";
}

export function RecommendClient({
  scenarios,
  mustHaves,
  brands,
  initialCategory = "all",
}: {
  scenarios: ScenarioMeta[];
  mustHaves: MustHaveMeta[];
  brands: string[];
  initialCategory?: DeviceCategory | "all";
}) {
  const [category, setCategory] = useState<DeviceCategory | "all">(initialCategory);
  const [scenarioId, setScenarioId] = useState<string>("");
  const [budget, setBudget] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [includeOlder, setIncludeOlder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult["data"] | null>(null);

  const visibleScenarios = scenarios.filter((scenario) => category === "all" || scenario.categories.includes(category));
  const visibleMustHaves = mustHaves.filter((item) => category === "all" || item.categories.includes(category));
  const activeScenario = visibleScenarios.find((scenario) => scenario.id === scenarioId) ?? null;

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submit() {
    if (!activeScenario) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenario: activeScenario.id,
          category,
          budgetMax: budget,
          brands: selectedBrands,
          mustHave: requirements,
          includeOlder,
          limit: 8,
        }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = await response.json() as ApiResult;
      setResult(payload.data);
    } catch {
      setError("The recommendation engine is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recommend-wizard">
      <div className="recommend-panel">
        <div className="recommend-step">
          <span className="recommend-step-number">1</span>
          <div>
            <h2>What are you shopping for?</h2>
            <div className="chip-row">{CATEGORY_LABELS.map((item) => <button key={item.id} type="button" className={category === item.id ? "chip active" : "chip"} onClick={() => { setCategory(item.id); setScenarioId(""); setResult(null); }}>{item.label}</button>)}</div>
          </div>
        </div>
        <div className="recommend-step">
          <span className="recommend-step-number">2</span>
          <div>
            <h2>How will you use it?</h2>
            <div className="scenario-grid">
              {visibleScenarios.map((scenario) => (
                <button key={scenario.id} type="button" className={scenarioId === scenario.id ? "scenario-card active" : "scenario-card"} onClick={() => setScenarioId(scenario.id)}>
                  <strong>{scenario.label}</strong>
                  <span>{scenario.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="recommend-step">
          <span className="recommend-step-number">3</span>
          <div>
            <h2>Set your limits</h2>
            <div className="recommend-controls">
              <label>Budget
                <select value={budget ?? ""} onChange={(event) => setBudget(event.target.value ? Number(event.target.value) : null)}>
                  {BUDGETS.map((item) => <option key={item.label} value={item.value ?? ""}>{item.label}</option>)}
                </select>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={includeOlder} onChange={(event) => setIncludeOlder(event.target.checked)} />
                Include devices older than 3 years
              </label>
            </div>
            {visibleMustHaves.length > 0 && (
              <>
                <h3>Must-have features <small>(optional)</small></h3>
                <div className="chip-row">{visibleMustHaves.map((item) => <button key={item.id} type="button" className={requirements.includes(item.id) ? "chip active" : "chip"} onClick={() => toggle(requirements, item.id, setRequirements)}>{item.label}</button>)}</div>
              </>
            )}
            <h3>Preferred brands <small>(optional — empty means all)</small></h3>
            <div className="chip-row wrap">{brands.map((brand) => <button key={brand} type="button" className={selectedBrands.includes(brand) ? "chip active" : "chip"} onClick={() => toggle(selectedBrands, brand, setSelectedBrands)}>{brand}</button>)}</div>
          </div>
        </div>
        <div className="recommend-submit">
          <button type="button" className="lime-button" disabled={!activeScenario || loading} onClick={submit}>
            {loading ? "Analyzing the catalog…" : activeScenario ? `Recommend for ${activeScenario.label.toLowerCase()} ↗` : "Pick a use case first"}
          </button>
          {error && <p className="recommend-error" role="alert">{error}</p>}
        </div>
      </div>

      {result && (
        <div className="recommend-results" id="results">
          <div className="recommend-results-heading">
            <div>
              <span className="section-kicker">Ranked for {result.scenario.label.toLowerCase()}</span>
              <h2>{result.recommendations.length ? `Your top ${result.recommendations.length} picks` : "No devices matched"}</h2>
            </div>
            <div className="catalog-count"><strong>{result.considered.toLocaleString()}</strong><span>devices considered</span></div>
          </div>
          {result.narrative && <div className="ai-narrative"><span>AI</span><p>{result.narrative}</p></div>}
          {!result.recommendations.length && <div className="empty-state"><span>⌕</span><h2>Nothing fits those limits</h2><p>Try widening the budget, removing a must-have, or including older devices.</p></div>}
          <div className="recommend-list">
            {result.recommendations.map((entry, index) => (
              <article key={entry.device.id} className="recommend-card">
                <span className="recommend-rank">#{index + 1}</span>
                <Link href={`/${categoryPath(entry.device.category)}/${entry.device.slug}`} className="recommend-photo">
                  <DevicePhoto src={entry.device.image.url} alt={`${entry.device.brand} ${entry.device.model}`} category={entry.device.category} accent={entry.device.accent} />
                </Link>
                <div className="recommend-card-body">
                  <div className="eyebrow-row"><span>{entry.device.brand}</span><small>{entry.device.startingPrice ? `From $${entry.device.startingPrice.toLocaleString()}` : "Price varies"}</small></div>
                  <h3><Link href={`/${categoryPath(entry.device.category)}/${entry.device.slug}`}>{entry.device.model}</Link></h3>
                  <div className="fit-score"><div className="score-bar-track"><i style={{ width: `${Math.min(100, entry.score)}%` }} /></div><b>{entry.score.toFixed(0)}/100 fit</b></div>
                  <ul className="recommend-reasons">{entry.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <div className="card-actions">
                    <Link className="text-link" href={`/${categoryPath(entry.device.category)}/${entry.device.slug}`}>Full specs & photos <span>↗</span></Link>
                    <Link className="compare-add" href={`/compare?devices=${result.recommendations.slice(0, 2).map((item) => item.device.id).includes(entry.device.id) ? result.recommendations.slice(0, 2).map((item) => item.device.id).join(",") : `${entry.device.id},${result.recommendations[0].device.id}`}`}>+ Compare</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="catalog-disclosure">Rankings are computed deterministically from sourced specification fields using the published weights for “{result.scenario.label}”. No hidden sponsorship or affiliate weighting.</p>
        </div>
      )}
    </div>
  );
}
