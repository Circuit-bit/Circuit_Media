import type { Metadata } from "next";
import { CompareClient, type DeviceOption } from "../../components/catalog/CompareClient";
import { devices, getDevice } from "../../lib/seed/catalog";

export const metadata: Metadata = { title: "Compare devices", description: "Compare up to four phones, tablets, or watches with source-linked specifications and priority-based verdicts." };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ devices?: string }> }) {
  const params = await searchParams;
  const requested = (params.devices?.split(",").filter(Boolean) ?? [])
    .map((id) => getDevice(id))
    .filter((device): device is NonNullable<typeof device> => Boolean(device))
    .slice(0, 4);
  const fallbackPool = devices.filter((device) => (requested[0] ? device.category === requested[0].category : device.category === "phone") && !requested.some((item) => item.id === device.id));
  const initial = requested.length >= 2 ? requested : [...requested, ...fallbackPool].slice(0, 2);
  const options: DeviceOption[] = devices.map((device) => ({ id: device.id, brand: device.brand, model: device.model, category: device.category }));
  return <main><section className="compare-page-hero"><div className="shell"><span className="section-kicker lime">Explainable comparison</span><h1>Difference,<br /><mark>decoded.</mark></h1><p>Compare two to four devices, select your priorities and inspect every source-linked field.</p></div></section><section className="compare-workspace shell"><CompareClient options={options} initialDevices={initial} /></section></main>;
}
