export const siteConfig = {
  name: "Circuit Media",
  shortName: "CM",
  tagline: "Real Context. Smarter Tech Choices.",
  description:
    "Smartphone, tech review and community — verified specifications, source-aware reviews, and explainable comparisons for phones, tablets, and watches.",
  logo: "/circuit-media-mark.png",
  logoFull: "/circuit-media-mark.png",
  accent: "#FF7A3D",
  heroAccent: "#8B8FFF",
  contactEmail: "hello@circuit-media-review.com",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://circuit-media-review.com",
  navigation: [
    { label: "Devices", href: "/devices" },
    { label: "Brands", href: "/brands" },
    { label: "Recommend", href: "/recommend" },
    { label: "Compare", href: "/compare" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
