import type { DeviceCategory } from "../types";
import { serverEnvironment } from "../http/runtime-env";

const DEFAULT_BASE_URL = "https://api.mobileapi.dev";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 30;

type UnknownRecord = Record<string, unknown>;

export type CatalogSpecification = {
  label: string;
  value: string;
};

export type CatalogSpecificationGroup = {
  name: string;
  items: CatalogSpecification[];
};

export type CatalogDevice = {
  id: number;
  brand: string;
  model: string;
  category: DeviceCategory | "other";
  description: string;
  releaseDate: string;
  imageUrl: string | null;
  colors: string[];
  storage: string;
  display: string;
  chipset: string;
  memory: string;
  camera: string;
  battery: string;
  weight: string;
  thickness: string;
  modelNumbers: string;
  specifications: CatalogSpecificationGroup[];
  sourceUrl: string;
};

export type CatalogImage = {
  id: number;
  type: string;
  url: string;
  caption: string;
  isOfficial: boolean;
  order: number;
};

export type CatalogPage = {
  devices: CatalogDevice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type CatalogQuery = {
  page?: number;
  limit?: number;
  query?: string;
  category?: DeviceCategory | "all";
  manufacturer?: string;
};

export class MobileApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MobileApiError";
  }
}

export function mobileApiConfigured() {
  return Boolean(serverEnvironment("DEVICE_API_KEY"));
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanUrl(value: unknown): string | null {
  const candidate = asText(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function categoryFromProvider(value: unknown): DeviceCategory | "other" {
  const type = asText(value).toLowerCase();
  if (type === "phone" || type === "tablet") return type;
  if (type === "wearable" || type === "watch" || type === "smartwatch") return "watch";
  return "other";
}

function items(entries: Array<[string, unknown]>): CatalogSpecification[] {
  return entries.flatMap(([label, value]) => {
    const text = asText(value);
    return text ? [{ label, value: text }] : [];
  });
}

function group(name: string, entries: Array<[string, unknown]>): CatalogSpecificationGroup | null {
  const normalized = items(entries);
  return normalized.length ? { name, items: normalized } : null;
}

export function normalizeMobileApiDevice(input: unknown): CatalogDevice {
  const raw = asRecord(input);
  const manufacturer = asRecord(raw.manufacturer);
  const network = asRecord(raw.network);
  const body = asRecord(raw.body);
  const display = asRecord(raw.display);
  const platform = asRecord(raw.platform);
  const memory = asRecord(raw.memory);
  const mainCamera = asRecord(raw.main_camera);
  const selfieCamera = asRecord(raw.selfie_camera);
  const sound = asRecord(raw.sound);
  const comms = asRecord(raw.comms);
  const features = asRecord(raw.features);
  const battery = asRecord(raw.battery);
  const misc = asRecord(raw.misc);
  const id = asNumber(raw.id);
  const brand = asText(raw.manufacturer_name) || asText(manufacturer.name) || "Unknown brand";
  const model = asText(raw.name) || "Unnamed device";
  const displaySummary = asText(raw.screen_resolution) || asText(display.size) || asText(display.resolution);
  const chipset = asText(platform.chipset) || asText(raw.hardware);
  const memorySummary = asText(memory.internal) || asText(raw.hardware);
  const cameraSummary = asText(raw.camera) || asText(mainCamera.single) || asText(mainCamera.dual) || asText(mainCamera.triple) || asText(mainCamera.quad);
  const batterySummary = asText(raw.battery_capacity) || asText(battery.type);
  const modelNumbers = asText(raw.model_numbers) || asText(misc.model_numbers);

  const specificationGroups = [
    group("Overview", [
      ["Device type", asText(raw.device_type)],
      ["Release date", raw.release_date],
      ["Model numbers", modelNumbers],
      ["Colors", raw.colors],
      ["Provider-listed price", misc.price],
    ]),
    group("Network", [
      ["Technology", network.technology],
      ["2G bands", network.bands_2g],
      ["3G bands", network.bands_3g],
      ["4G bands", network.bands_4g],
      ["5G bands", network.bands_5g],
      ["Speed", network.speed],
    ]),
    group("Body", [
      ["Dimensions", body.dimensions],
      ["Weight", asText(body.weight) || raw.weight],
      ["Thickness", raw.thickness],
      ["Build", body.build],
      ["SIM", body.sim],
      ["Other", body.other],
    ]),
    group("Display", [
      ["Type", display.type],
      ["Size", display.size],
      ["Resolution", asText(display.resolution) || raw.screen_resolution],
      ["Protection", display.protection],
      ["Other", display.other],
    ]),
    group("Platform", [
      ["Operating system", platform.os],
      ["Chipset", platform.chipset],
      ["CPU", platform.cpu],
      ["GPU", platform.gpu],
    ]),
    group("Memory", [
      ["Internal", asText(memory.internal) || raw.storage],
      ["Card slot", memory.card_slot],
      ["Other", memory.other],
    ]),
    group("Main camera", [
      ["Single", mainCamera.single],
      ["Dual", mainCamera.dual],
      ["Triple", mainCamera.triple],
      ["Quad", mainCamera.quad],
      ["Features", mainCamera.features],
      ["Video", mainCamera.video],
    ]),
    group("Selfie camera", [
      ["Single", selfieCamera.single],
      ["Dual", selfieCamera.dual],
      ["Features", selfieCamera.features],
      ["Video", selfieCamera.video],
    ]),
    group("Sound", [
      ["Loudspeaker", sound.loudspeaker],
      ["3.5mm jack", sound.jack_3_5mm],
      ["Other", sound.other],
    ]),
    group("Connectivity", [
      ["WLAN", comms.wlan],
      ["Bluetooth", comms.bluetooth],
      ["Positioning", comms.positioning],
      ["NFC", comms.nfc],
      ["Radio", comms.radio],
      ["USB", comms.usb],
      ["Other", comms.other],
    ]),
    group("Features", [
      ["Sensors", features.sensors],
      ["Other", features.other],
    ]),
    group("Battery", [
      ["Type", asText(battery.type) || raw.battery_capacity],
      ["Charging", battery.charging],
    ]),
    group("Miscellaneous", [
      ["Model numbers", modelNumbers],
      ["SAR US", misc.sar_us],
      ["SAR EU", misc.sar_eu],
      ["Price", misc.price],
    ]),
  ].filter((value): value is CatalogSpecificationGroup => Boolean(value));

  const highlights = [displaySummary, chipset, batterySummary].filter(Boolean).join(" · ");
  return {
    id,
    brand,
    model,
    category: categoryFromProvider(raw.device_type),
    description: asText(raw.description) || highlights || `${brand} ${model} device record supplied by MobileAPI.`,
    releaseDate: asText(raw.release_date) || "Not confirmed",
    imageUrl: cleanUrl(raw.image_url),
    colors: asText(raw.colors).split(",").map((color) => color.trim()).filter(Boolean),
    storage: asText(raw.storage) || asText(memory.internal) || "Not confirmed",
    display: displaySummary || "Not confirmed",
    chipset: chipset || "Not confirmed",
    memory: memorySummary || "Not confirmed",
    camera: cameraSummary || "Not confirmed",
    battery: batterySummary || "Not confirmed",
    weight: asText(raw.weight) || asText(body.weight) || "Not confirmed",
    thickness: asText(raw.thickness) || "Not confirmed",
    modelNumbers: modelNumbers || "Not confirmed",
    specifications: specificationGroups,
    sourceUrl: `${DEFAULT_BASE_URL}/devices/${id}/`,
  };
}

function clampInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value as number)));
}

async function mobileApiRequest(path: string, parameters: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<unknown> {
  const key = serverEnvironment("DEVICE_API_KEY");
  if (!key) throw new MobileApiError("MobileAPI is not configured", 503);
  const configuredBase = serverEnvironment("DEVICE_API_URL") || DEFAULT_BASE_URL;
  const base = configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  for (const [name, value] of Object.entries(parameters)) if (value !== undefined && value !== "") url.searchParams.set(name, String(value));

  let response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "user-agent": "CircuitMedia/1.0 (+https://circuit-media.com)",
    },
    signal,
  });
  if (response.status === 403) {
    // Some upstream edge configurations reject Authorization headers from
    // serverless egress. MobileAPI documents `?key=` as an equivalent fallback.
    const fallbackUrl = new URL(url);
    fallbackUrl.searchParams.set("key", key);
    response = await fetch(fallbackUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "CircuitMedia/1.0 (+https://circuit-media.com)",
      },
      signal,
    });
  }
  if (!response.ok) {
    let detail = "";
    try {
      const payload = asRecord(await response.json());
      detail = asText(payload.detail);
    } catch {
      // Provider errors are deliberately reduced to a safe status message.
    }
    throw new MobileApiError(detail || `MobileAPI returned ${response.status}`, response.status);
  }
  return response.json();
}

function pageFromPayload(payload: unknown): CatalogPage {
  const raw = asRecord(payload);
  const rawDevices = Array.isArray(raw.devices) ? raw.devices : [];
  const devices = rawDevices.map(normalizeMobileApiDevice).filter((device) => device.id > 0);
  const pageSize = asNumber(raw.page_size, devices.length || DEFAULT_PAGE_SIZE);
  return {
    devices,
    total: asNumber(raw.total, devices.length),
    page: asNumber(raw.page, 1),
    pageSize,
    totalPages: asNumber(raw.total_pages, Math.max(1, Math.ceil(devices.length / Math.max(1, pageSize)))),
    hasNext: Boolean(raw.has_next),
    hasPrevious: Boolean(raw.has_previous),
  };
}

export async function listMobileDevices(query: CatalogQuery = {}, signal?: AbortSignal): Promise<CatalogPage> {
  const page = clampInteger(query.page, 1, 1, 100_000);
  const limit = clampInteger(query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const name = query.query?.trim();
  const manufacturer = query.manufacturer?.trim();
  const category = query.category && query.category !== "all" ? query.category : undefined;
  let path = "/devices/";
  const parameters: Record<string, string | number | undefined> = { page, limit };

  if (name) {
    path = "/devices/search/";
    parameters.name = name;
  } else if (manufacturer && manufacturer.toLowerCase() !== "all") {
    path = "/devices/by-manufacturer/";
    parameters.manufacturer = manufacturer;
  } else if (category) {
    path = "/devices/by-type/";
    parameters.type = category === "watch" ? "wearable" : category;
  }

  const result = pageFromPayload(await mobileApiRequest(path, parameters, signal));
  if (!category || !name && !manufacturer) return result;
  return { ...result, devices: result.devices.filter((device) => device.category === category) };
}

export async function getMobileDevice(id: string | number, signal?: AbortSignal): Promise<CatalogDevice> {
  const normalizedId = String(id);
  if (!/^\d+$/.test(normalizedId)) throw new MobileApiError("Invalid device identifier", 400);
  return normalizeMobileApiDevice(await mobileApiRequest(`/devices/${normalizedId}/`, {}, signal));
}

export async function getMobileDeviceImages(id: string | number, signal?: AbortSignal): Promise<CatalogImage[]> {
  const normalizedId = String(id);
  if (!/^\d+$/.test(normalizedId)) throw new MobileApiError("Invalid device identifier", 400);
  const payload = await mobileApiRequest(`/devices/${normalizedId}/images/`, {}, signal);
  const rawImages = Array.isArray(payload) ? payload : Array.isArray(asRecord(payload).images) ? asRecord(payload).images as unknown[] : [];
  return rawImages.flatMap((entry) => {
    const raw = asRecord(entry);
    const url = cleanUrl(raw.image_url);
    if (!url) return [];
    return [{
      id: asNumber(raw.id),
      type: asText(raw.type) || "gallery",
      url,
      caption: asText(raw.caption),
      isOfficial: Boolean(raw.is_official),
      order: asNumber(raw.order),
    }];
  }).sort((a, b) => a.order - b.order);
}
