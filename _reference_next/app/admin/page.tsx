import type { Metadata } from "next";
import Link from "next/link";
import { datasetInfo, devices } from "../../lib/seed/catalog";
import { liveBrands } from "../../lib/live/live-catalog";

export const metadata: Metadata = { title: "Data desk" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const verified = devices.filter((device) => device.verification === "verified").length;
  const { brands, totalDevices } = await liveBrands();
  return (
    <main className="admin-main">
      <section className="admin-hero"><div className="shell"><span className="section-kicker lime">Operations</span><h1>Data desk.</h1><p>Inspect live catalog connectivity, the local analysis cache, and approval workflows.</p></div></section>
      <section className="admin-shell shell">
        <div className="admin-stats">
          <div><span>Live catalog</span><strong>{totalDevices.toLocaleString()}</strong><small>{brands.length} brands · live API</small></div>
          <div><span>Analysis cache</span><strong>{datasetInfo.count.toLocaleString()}</strong><small>Fully scored local records</small></div>
          <div><span>Verified cache</span><strong>{verified}</strong><small>Source-linked specs</small></div>
          <div><span>Photo feed</span><strong>Live</strong><small>Live product photos</small></div>
        </div>
        <div className="admin-grid">
          <section>
            <div className="admin-section-heading"><div><span className="section-kicker">Provider status</span><h2>Data pipeline</h2></div><Link className="outline-button" href="/brands">Open brands</Link></div>
            <div className="provider-list">
              {[
                { name: "Specifications", mode: "Live specification API", status: "Healthy" },
                { name: "Product images", mode: "Live product photos", status: "Healthy" },
                { name: "Brand directory", mode: `${brands.length} manufacturers`, status: "Healthy" },
                { name: "Recommendations", mode: "Deterministic scoring + cache", status: "Healthy" },
                { name: "Benchmarks", mode: "No data", status: "Action needed" },
                { name: "AI narrative", mode: "Optional via AI_API_KEY", status: "Healthy" },
              ].map((item) => (
                <div key={item.name}><span className={item.status === "Healthy" ? "health-dot" : "health-dot warn"} /><strong>{item.name}</strong><span>{item.mode}</span><b>{item.status}</b></div>
              ))}
            </div>
          </section>
          <aside>
            <span className="section-kicker">Next actions</span>
            <h2>Operations checklist</h2>
            <ol>
              <li>Confirm image licensing for production.</li>
              <li>Optionally self-host SPECS_API_URL for reliability.</li>
              <li>Refresh the analysis cache with node scripts/seed.mjs.</li>
              <li>Configure AI endpoint and approval thresholds.</li>
            </ol>
            <Link href="/api/admin/import">Admin API docs ↗</Link>
          </aside>
        </div>
        <section className="import-table-section">
          <div className="admin-section-heading"><div><span className="section-kicker">Analysis cache</span><h2>Recently cached devices</h2></div></div>
          <div className="admin-table">
            {devices.slice(0, 20).map((device) => (
              <div key={device.id}><span className="update-status">✓</span><div><strong>{device.brand} {device.model}</strong><small>{device.modelNumber}</small></div><span>{device.category}</span><span>{device.sources[0].provider}</span><time>{device.lastUpdated}</time><b>{device.verification}</b></div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
