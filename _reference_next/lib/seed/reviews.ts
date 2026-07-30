/**
 * Editorial reviews generated from the analyzed catalog: the top-scoring
 * recent devices in each category get a lab-style verdict derived from
 * their computed strengths and tradeoffs.
 */
import { devices, featuresOf } from "./catalog";
import type { Device, DeviceCategory, ProfessionalReview } from "../types";

const AUTHORS = ["Mara Chen", "Jon Bell", "Ari Reed", "Priya Nair", "Sam Okafor", "Lena Vogt"];

function titleFor(device: Device): string {
  const top = device.bestFor[0] ?? "Everyday use";
  const map: Record<string, string> = {
    Gaming: "Built for the leaderboard",
    Photography: "A camera you carry everywhere",
    "Battery life": "The charger can wait",
    Value: "Punching far above its price",
    "One-hand use": "Small phone, few compromises",
    "Creative work": "A canvas that keeps up",
    Video: "A pocket production studio",
    "Fitness tracking": "A coach on your wrist",
    "Health sensors": "Quiet health intelligence",
    "Everyday use": "Dependable, day after day",
  };
  return map[top] ?? "Tested and measured";
}

function excerptFor(device: Device): string {
  const strength = device.pros[0]?.toLowerCase() ?? "balanced hardware";
  const tradeoff = device.cons[0]?.toLowerCase();
  return `Our spec-model analysis places the ${device.brand} ${device.model} at ${device.score.toFixed(1)}/10, led by ${strength}${tradeoff ? `; ${tradeoff} is the clearest tradeoff` : ""}.`;
}

function pickTop(category: DeviceCategory, count: number): Device[] {
  return devices
    .filter((device) => device.category === category && (featuresOf(device)?.releaseYear ?? 0) >= new Date().getFullYear() - 2)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, count);
}

const reviewed = [...pickTop("phone", 5), ...pickTop("tablet", 2), ...pickTop("watch", 2)];

export const professionalReviews: ProfessionalReview[] = reviewed.map((device, index) => ({
  id: `review-${device.id}`,
  deviceId: device.id,
  title: titleFor(device),
  outlet: "Circuit Media Lab",
  author: AUTHORS[index % AUTHORS.length],
  score: device.score,
  excerpt: excerptFor(device),
  url: `/reviews/${device.slug}`,
  publishedAt: device.lastUpdated,
}));

export function reviewForDevice(deviceId: string): ProfessionalReview | undefined {
  return professionalReviews.find((review) => review.deviceId === deviceId);
}

export function getReviewBySlug(slug: string): { review: ProfessionalReview; device: Device } | undefined {
  const review = professionalReviews.find((item) => item.url.endsWith(`/${slug}`));
  if (!review) return undefined;
  const device = devices.find((item) => item.id === review.deviceId);
  return device ? { review, device } : undefined;
}
