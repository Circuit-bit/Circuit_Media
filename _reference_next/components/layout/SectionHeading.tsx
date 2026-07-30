import Link from "next/link";

export function SectionHeading({ kicker, title, description, href, linkLabel = "View all" }: { kicker: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-heading">
      <div><span className="section-kicker">{kicker}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {href && <Link className="ghost-button" href={href}>{linkLabel} <span>↗</span></Link>}
    </div>
  );
}
