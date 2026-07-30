import Link from "next/link";
import type { Device } from "../../lib/types";
import { DevicePhoto } from "./DevicePhoto";

export function DeviceCard({ device, featured = false }: { device: Device; featured?: boolean }) {
  const categoryPath = device.category === "phone" ? "phones" : device.category === "tablet" ? "tablets" : "watches";
  return (
    <article className={`device-card catalog-device-card ${featured ? "featured" : ""}`}>
      <Link href={`/${categoryPath}/${device.slug}`} className="device-card-visual" aria-label={`Open ${device.brand} ${device.model}`}>
        <DevicePhoto src={device.image.url} alt={`${device.brand} ${device.model}`} category={device.category} accent={device.accent} />
      </Link>
      <div className="device-card-body">
        <div className="eyebrow-row"><span>{device.brand}</span><strong>{device.score.toFixed(1)}</strong></div>
        <h3><Link href={`/${categoryPath}/${device.slug}`}>{device.model}</Link></h3>
        <p>{device.summary}</p>
        <div className="device-card-meta">
          <span>{device.startingPrice ? `From $${device.startingPrice.toLocaleString()}` : "Price varies by region"}</span>
          <span>{new Date(device.releaseDate).getFullYear()}</span>
        </div>
        <div className="card-actions">
          <Link className="text-link" href={`/${categoryPath}/${device.slug}`}>Specs & photos <span>↗</span></Link>
          <Link className="compare-add" href={`/compare?devices=${device.id}`}>+ Compare</Link>
        </div>
      </div>
    </article>
  );
}
