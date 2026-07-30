import type { Metadata } from "next";
import Link from "next/link";
import { devices } from "../../lib/seed/catalog";
import { professionalReviews } from "../../lib/seed/reviews";

export const metadata: Metadata = { title: "Independent device reviews", description: "Method-led reviews of the top-scoring phones, tablets, and watches in the sourced catalog." };

export default function ReviewsPage() {
  return (
    <main>
      <section className="reviews-hero"><div className="shell"><span className="section-kicker lime">Circuit Media Lab</span><h1>Tested with a method.<br />Written with a point of view.</h1><p>Every verdict below is generated from the sourced specification record and our published component weights — AI never invents a measurement.</p></div></section>
      <section className="reviews-page shell">
        <div className="review-feature"><div><span>Our promise</span><h2>Facts have timestamps.<br />Opinions have bylines.</h2></div><Link className="outline-button" href="/methodology">Read the methodology ↗</Link></div>
        <div className="large-review-list">
          {professionalReviews.map((review, index) => {
            const device = devices.find((item) => item.id === review.deviceId)!;
            return <Link href={review.url} key={review.id}><span className={`review-index index-${(index % 3) + 1}`}>{String(index + 1).padStart(2, "0")}</span><div><small>{review.publishedAt} · {review.author}</small><h2>{review.title}</h2><p>{device.brand} {device.model} — {review.excerpt}</p><b>Design · Display · Performance · Camera · Battery · Value</b></div><strong>{review.score.toFixed(1)}</strong></Link>;
          })}
        </div>
      </section>
    </main>
  );
}
