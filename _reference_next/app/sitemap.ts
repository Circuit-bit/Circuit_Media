import type { MetadataRoute } from "next";
import { devices } from "../lib/seed/catalog";
import { siteConfig } from "../lib/site-config";
export default function sitemap(): MetadataRoute.Sitemap { const fixed = ["", "/devices", "/brands", "/recommend", "/compare", "/reviews", "/search", "/methodology", "/editorial-policy", "/sources", "/ai-disclosure", "/privacy", "/terms"]; const product = devices.map((device) => `/${device.category === "phone" ? "phones" : device.category === "tablet" ? "tablets" : "watches"}/${device.slug}`); return [...fixed, ...product].map((path) => ({ url: `${siteConfig.baseUrl}${path}`, lastModified: new Date() })); }
