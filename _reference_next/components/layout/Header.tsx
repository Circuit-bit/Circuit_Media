"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { siteConfig } from "../../lib/site-config";

export function Header() {
  const [open, setOpen] = useState(false);
  const navId = useId();

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("nav-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("nav-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <header className="site-header">
      <Link className="brand brand-logo" href="/" aria-label="Circuit Media home" onClick={() => setOpen(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteConfig.logo} alt="Circuit Media" className="brand-logo-img" width={44} height={44} />
        <span className="brand-wordmark">Circuit Media</span>
      </Link>
      <nav id={navId} className={open ? "primary-nav is-open" : "primary-nav"} aria-label="Main navigation">
        {siteConfig.navigation.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
        ))}
        <Link href="/search" className="mobile-search-link" onClick={() => setOpen(false)}>Search</Link>
        <Link href="/recommend" className="mobile-cta-link" onClick={() => setOpen(false)}>Get started</Link>
      </nav>
      <div className="header-actions">
        <Link className="ghost-button header-search" href="/search">Search</Link>
        <Link className="primary-button header-cta" href="/recommend">Get started</Link>
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && <button type="button" className="nav-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
  );
}
