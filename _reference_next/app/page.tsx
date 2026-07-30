import Link from "next/link";
import { DeviceCard } from "../components/device/DeviceCard";
import { SearchBox } from "../components/catalog/SearchBox";
import { SectionHeading } from "../components/layout/SectionHeading";
import { liveFeatured } from "../lib/live/live-catalog";
import { professionalReviews } from "../lib/seed/reviews";
import { devices } from "../lib/seed/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { popular, latest, totalDevices, brandCount } = await liveFeatured();
  const compareDefaults = popular.slice(0, 2);
  const updated = popular.slice(0, 4);

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="hero-eyebrow">Smartphone · Tech Review · Community</p>
          <h1>
            Circuit Media
            <span>Real context for smarter tech choices.</span>
          </h1>
          <p>
            Live specs and photos for {totalDevices.toLocaleString()} phones, tablets and watches across {brandCount} brands —
            with recommendations you can audit.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/recommend">Get started →</Link>
            <Link className="soft-button" href="/compare">How compare works</Link>
          </div>
          <Link className="hero-video-link" href="/search">
            <span aria-hidden="true">▶</span>
            Search the live catalog
          </Link>
          <SearchBox />
        </div>
        <div className="hero-visual">
          <div className="hero-visual-frame">
            <picture>
              <source srcSet="/hero-device.webp" type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-device.png" alt="Flagship phones from Apple, OnePlus, vivo, Samsung, and Google" width={1001} height={496} decoding="async" fetchPriority="high" />
            </picture>
          </div>
          <div className="hero-float-card">
            <strong>{brandCount}+ brands</strong>
            <span>{totalDevices.toLocaleString()} live devices sourced</span>
          </div>
        </div>
      </section>

      <section className="quick-categories shell" aria-label="Browse categories">
        <Link href="/devices"><span className="category-glyph phone-glyph">▦</span><div><strong>Devices</strong><small>Phones, tablets & watches</small></div><b>↗</b></Link>
        <Link href="/devices?category=phone"><span className="category-glyph phone-glyph">▯</span><div><strong>Phones</strong><small>Live smartphones catalog</small></div><b>↗</b></Link>
        <Link href="/brands"><span className="category-glyph tablet-glyph">▦</span><div><strong>Brands</strong><small>{brandCount} manufacturers covered</small></div><b>↗</b></Link>
        <Link href="/recommend"><span className="category-glyph watch-glyph">◉</span><div><strong>Recommend</strong><small>Match a device to your use</small></div><b>↗</b></Link>
      </section>

      <section className="content-section shell">
        <SectionHeading kicker="Trending now" title="What people are researching" href="/search?sort=popular" />
        <div className="device-grid four">{popular.slice(0, 4).map((device) => <DeviceCard key={device.id} device={device} />)}</div>
      </section>

      <section className="compare-band">
        <div className="shell compare-band-inner">
          <div className="compare-copy">
            <span className="section-kicker">Decision engine</span>
            <h2>Tell us how you use it.<br />We&apos;ll shortlist it.</h2>
            <p>Pick a use case—gaming, photography, battery, budget—set your budget, and get ranked recommendations with the exact spec evidence behind each pick.</p>
            <Link className="primary-button" href="/recommend">Get my recommendation <span>↗</span></Link>
          </div>
          <div className="comparison-preview">
            <div className="preview-heading"><span>AI recommendation</span><span>Photography · under $1,100</span></div>
            <div className="preview-products">{compareDefaults.map((device, index) => <div key={device.id}>{index === 1 && <div className="versus">VS</div>}<strong>{device.brand} {device.model}</strong><small>Ranked pick</small></div>)}</div>
            <div className="preview-row"><span>Why</span><b>Weighted spec scoring</b><b className="winner">Explainable facts</b></div>
            <div className="preview-row"><span>Fit</span><b>Use-case match</b><b>Budget aware</b></div>
            <small className="preview-disclaimer">Rankings change with your priorities — and we show the math.</small>
          </div>
        </div>
      </section>

      <section className="content-section shell">
        <SectionHeading kicker="Just landed" title="Latest releases" description="Devices currently topping the live interest list." href="/brands" />
        <div className="device-grid three">{latest.slice(0, 3).map((device) => <DeviceCard key={device.id} device={device} featured />)}</div>
      </section>

      <section className="editorial-grid shell">
        <div className="editorial-lead">
          <span className="section-kicker">From the lab</span>
          <h2>Reviews with a method,<br />not just a verdict.</h2>
          <p>Editorial verdicts, automated spec analysis, and external reviews stay clearly separated.</p>
          <Link className="ghost-button" href="/reviews">Read all reviews ↗</Link>
        </div>
        <div className="review-list">
          {professionalReviews.slice(0, 3).map((review, index) => {
            const device = devices.find((item) => item.id === review.deviceId)!;
            return (
              <Link key={review.id} href={review.url} className="review-row">
                <span className={`review-index index-${index + 1}`}>0{index + 1}</span>
                <div>
                  <small>{review.outlet} · {new Date(review.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small>
                  <h3>{review.title}</h3>
                  <p>{device.brand} {device.model} — {review.excerpt}</p>
                </div>
                <strong>{review.score.toFixed(1)}</strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="budget-section shell">
        <SectionHeading kicker="Buy smarter" title="Best by budget" description="Browse devices by price band — regional pricing varies." />
        <div className="budget-grid">
          <Link href="/search?maxPrice=300"><span>Under</span><strong>$300</strong><small>Everyday essentials</small><b>↗</b></Link>
          <Link href="/search?maxPrice=600"><span>Under</span><strong>$600</strong><small>Upper mid-range</small><b>↗</b></Link>
          <Link href="/search?maxPrice=1000"><span>Under</span><strong>$1K</strong><small>Flagship territory</small><b>↗</b></Link>
          <Link href="/brands"><span>Browse</span><strong>Brands</strong><small>All {brandCount} manufacturers</small><b>↗</b></Link>
        </div>
      </section>

      <section className="update-section shell">
        <SectionHeading kicker="Live feed" title="Currently trending" href="/search?sort=popular" linkLabel="View all" />
        <div className="update-table" role="table" aria-label="Trending devices">
          {updated.map((device) => (
            <Link
              href={`/${device.category === "phone" ? "phones" : device.category === "tablet" ? "tablets" : "watches"}/${device.slug}`}
              key={device.id}
              role="row"
            >
              <span className="update-status">✓</span>
              <strong>{device.brand} {device.model}</strong>
              <span>Trending</span>
              <span>{device.brand}</span>
              <time>Now</time>
              <b>↗</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="newsletter shell">
        <div>
          <span className="section-kicker">Signal, not noise</span>
          <h2>One smart device briefing.<br />Every Friday.</h2>
        </div>
        <form>
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input id="newsletter-email" type="email" placeholder="you@example.com" />
          <button type="submit">Join the briefing ↗</button>
        </form>
      </section>
    </main>
  );
}
