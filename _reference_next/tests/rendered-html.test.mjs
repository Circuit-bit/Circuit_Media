import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  SPECS_API_URL: "https://mobile-specs-api-sandy.vercel.app",
};
const context = { waitUntil() {}, passThroughOnException() {} };

async function request(path, init) { return worker.fetch(new Request(`http://localhost${path}`, init), env, context); }

test("server-renders the Circuit Media homepage without an auth gate", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Circuit Media/);
  assert.match(html, /Know the device/);
  assert.match(html, /Not the hype/);
  assert.doesNotMatch(html, /codex-preview|signin-with-chatgpt|react-loading-skeleton/i);
});

test("lists live brands through the API", async () => {
  const response = await request("/api/brands");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.length >= 50, "expected dozens of brands");
  assert.ok(payload.meta.totalDevices > 1000, "expected thousands of devices across brands");
  assert.ok(payload.data.some((brand) => /samsung/i.test(brand.name)));
});

test("searches the live catalog for a known model", async () => {
  const response = await request("/api/search?q=iphone%2016");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.length > 0, "expected live search hits for iPhone 16");
  assert.equal(payload.meta.provider, "live");
});

test("resolves a live product page with full specifications", async () => {
  const search = await (await request("/api/search?q=galaxy%20s25%20ultra")).json();
  assert.ok(search.data.length > 0);
  const device = search.data[0];
  const detail = await request(`/api/devices/${encodeURIComponent(device.sourceSlug || device.slug)}`);
  assert.equal(detail.status, 200);
  const payload = await detail.json();
  assert.ok(payload.data.specifications.length >= 5, "expected a full live spec sheet");
  assert.equal(payload.data.sources[0].provider, "Circuit Media catalog");
});

test("recommendation engine still ranks devices for a use case", async () => {
  const response = await request("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario: "gaming", category: "phone", limit: 5 }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.data.recommendations.length > 0);
  assert.ok(payload.data.recommendations[0].reasons.length > 0);
});

test("serves the brands directory page", async () => {
  const response = await request("/brands");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Every brand|All brands|brands/i);
});
