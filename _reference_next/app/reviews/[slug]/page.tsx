import Link from "next/link";
import { notFound } from "next/navigation";
import { featuresOf } from "../../../lib/seed/catalog";
import { getReviewBySlug } from "../../../lib/seed/reviews";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = getReviewBySlug(slug);
  if (!found) notFound();
  const { review, device } = found;
  const features = featuresOf(device);
  const scores = device.componentScores;
  const sections: Array<[string, string]> = [
    ["Design and build", `${device.brand} ${device.model} ${features?.weightGrams ? `weighs ${features.weightGrams}g` : "keeps its weight unlisted"}${features?.thicknessMm ? ` at ${features.thicknessMm}mm thick` : ""}. ${features?.ipRating ? `It carries an ${features.ipRating} rating` : "It has no published ingress rating"}${features?.premiumBuild ? " and uses premium materials in its construction." : "."} Build scores ${scores?.build.toFixed(1) ?? "—"}/10 in our model.`],
    ["Display", `${features?.displayInches ? `The ${features.displayInches}″ ${features.isOled ? "OLED" : features?.displayPanel} panel` : "The display"}${features?.refreshHz ? ` runs at up to ${features.refreshHz}Hz` : ""}${features?.ppi ? ` with ${features.ppi} ppi sharpness` : ""}${features?.brightnessNits ? ` and a listed peak of ${features.brightnessNits} nits` : ""}. Display scores ${scores?.display.toFixed(1) ?? "—"}/10.`],
    ["Performance", `${features?.chipset ? `Powered by the ${features.chipset.split("(")[0].trim()}` : "The platform"}${features?.maxRamGb ? ` with up to ${features.maxRamGb}GB of RAM` : ""}${features?.maxStorageGb ? ` and up to ${features.maxStorageGb >= 1024 ? `${features.maxStorageGb / 1024}TB` : `${features.maxStorageGb}GB`} of storage` : ""}. Performance scores ${scores?.performance.toFixed(1) ?? "—"}/10 in our chipset-tier model.`],
    ["Cameras", `${features?.mainCameraMp ? `The main system is led by a ${features.mainCameraMp}MP sensor${features.lensCount > 1 ? ` in a ${features.lensCount}-camera array` : ""}` : "Camera details are limited in the source record"}${features?.hasOis ? ", stabilized optically" : ""}${features?.hasTelephoto ? `, with ${features.hasPeriscope ? "periscope" : "telephoto"} zoom` : ""}${features?.maxVideo ? `, recording up to ${features.maxVideo} video` : ""}. Camera scores ${scores?.camera.toFixed(1) ?? "—"}/10.`],
    ["Software", `${features?.os || "The operating system is not listed in the source record"}. Update policy should be confirmed with the manufacturer before purchase.`],
    ["Battery", `${features?.batteryMah ? `A ${features.batteryMah.toLocaleString()} mAh cell` : "Battery capacity is unlisted"}${features?.chargeWatts ? ` charges at up to ${features.chargeWatts}W` : ""}${features?.wirelessCharging ? " and supports wireless charging" : ""}. Battery scores ${scores?.battery.toFixed(1) ?? "—"}/10.`],
    ["Value", `${device.startingPrice ? `Listed from $${device.startingPrice.toLocaleString()}, it` : "With regional pricing, it"} earns an overall ${device.score.toFixed(1)}/10 in our published weighting for ${device.category === "phone" ? "smartphones" : device.category === "tablet" ? "tablets" : "smartwatches"}.`],
  ];
  return (
    <main>
      <article className="review-article shell">
        <div className="breadcrumbs"><Link href="/reviews">Reviews</Link><span>/</span><strong>{review.title}</strong></div>
        <header><span className="section-kicker">Circuit Media Lab · {device.brand}</span><h1>{review.title}</h1><p>{review.excerpt}</p><div><span>By {review.author}</span><time>{review.publishedAt}</time><strong>{review.score.toFixed(1)} / 10</strong></div></header>
        <section className="method-callout"><strong>Review methodology</strong><p>This verdict is generated from the sourced specification record using our published component weights. It contains no invented measurements; original lab benchmarks are added only when a BenchmarkProvider is configured.</p><Link href="/methodology">Full methodology ↗</Link></section>
        {sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
        <section><h2>Pros and cons</h2><div className="pros-cons"><div><h3>Pros</h3><ul>{device.pros.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Cons</h3><ul>{(device.cons.length ? device.cons : ["No notable tradeoffs detected"]).map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
        <footer><h2>Final verdict</h2><p>{review.excerpt}</p><Link className="lime-button" href={`/compare?devices=${device.id}`}>Compare {device.model} ↗</Link></footer>
      </article>
    </main>
  );
}
