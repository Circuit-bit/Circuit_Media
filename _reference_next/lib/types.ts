export type DeviceCategory = "phone" | "tablet" | "watch";
export type VerificationStatus = "verified" | "conflicting" | "unverified";

export type DataSource = {
  id: string;
  provider: string;
  url: string;
  verifiedAt: string;
  license?: string;
};

export type Specification = {
  label: string;
  value: string;
  status: VerificationStatus;
  sourceId: string;
};

export type SpecificationGroup = {
  name: string;
  items: Specification[];
};

export type DevicePhoto = {
  color: string;
  url: string;
};

export type ComponentScores = {
  performance: number;
  display: number;
  camera: number;
  battery: number;
  build: number;
};

export type Device = {
  id: string;
  slug: string;
  /** Original GSMArena slug used for live API lookups (may include underscores / parentheses). */
  sourceSlug?: string;
  brand: string;
  model: string;
  modelNumber: string;
  category: DeviceCategory;
  announcementDate: string;
  releaseDate: string;
  availability: string;
  startingPrice: number | null;
  currency: "USD";
  colors: string[];
  variants: string[];
  officialUrl: string;
  lastUpdated: string;
  verification: VerificationStatus;
  score: number;
  popularity: number;
  summary: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  specifications: SpecificationGroup[];
  sources: DataSource[];
  accent: string;
  image: {
    url: string | null;
    sourceUrl: string;
    provider: string;
    license: string;
    verifiedAt: string;
  };
  photos?: DevicePhoto[];
  componentScores?: ComponentScores;
  reviewUrl?: string | null;
};

export type ProfessionalReview = {
  id: string;
  deviceId: string;
  title: string;
  outlet: string;
  author: string;
  score: number;
  excerpt: string;
  url: string;
  publishedAt: string;
};
