import Link from "next/link";
import { siteConfig } from "../../lib/site-config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="brand brand-logo" href="/" aria-label="Circuit Media home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={siteConfig.logoFull} alt="Circuit Media" className="brand-logo-img footer-logo-img" width={72} height={72} />
        </Link>
        <p>{siteConfig.description}</p>
        <small className="footer-tagline">{siteConfig.tagline}</small>
      </div>
      <div>
        <h3>Explore</h3>
        <Link href="/devices">Devices</Link>
        <Link href="/brands">Brands</Link>
        <Link href="/recommend">Recommend</Link>
        <Link href="/compare">Compare</Link>
      </div>
      <div>
        <h3>Trust</h3>
        <Link href="/methodology">Methodology</Link>
        <Link href="/editorial-policy">Editorial policy</Link>
        <Link href="/corrections">Corrections</Link>
        <Link href="/ai-disclosure">AI disclosure</Link>
      </div>
      <div>
        <h3>Legal</h3>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
        <Link href="/ai-disclosure">AI disclosure</Link>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} Circuit Media</span>
        <span>Smartphone · Tech Review · Community</span>
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
      </div>
    </footer>
  );
}
