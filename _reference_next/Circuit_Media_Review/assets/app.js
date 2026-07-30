/* Circuit Media — full client app for GitHub Pages */
(function () {
  const BASE = location.pathname.includes("/Circuit_Media")
    ? "/Circuit_Media"
    : location.pathname.replace(/\/$/, "") || "";

  const state = {
    data: null,
    compareIds: JSON.parse(localStorage.getItem("cm-compare") || "[]"),
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function href(path) {
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${BASE}${clean === "/" ? "/" : clean}`;
  }

  function asset(file) {
    return `${BASE}/assets/${file}`;
  }

  function categoryPath(category) {
    return category === "tablet" ? "tablets" : category === "watch" ? "watches" : "phones";
  }

  function yearOf(d) {
    const m = String(d.releaseDate || "").match(/20[0-3]\d/);
    return m ? m[0] : "—";
  }

  function priceOf(d) {
    return d.startingPrice != null ? `From $${Number(d.startingPrice).toLocaleString()}` : "Price varies";
  }

  function parseRoute() {
    let path = location.pathname;
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length) || "/";
    path = path.replace(/\/index\.html$/, "/") || "/";
    const parts = path.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    const q = Object.fromEntries(new URLSearchParams(location.search));
    if (!parts.length) return { name: "home", q };
    if (parts[0] === "phones" && parts[1]) return { name: "device", category: "phone", slug: parts[1], q };
    if (parts[0] === "tablets" && parts[1]) return { name: "device", category: "tablet", slug: parts[1], q };
    if (parts[0] === "watches" && parts[1]) return { name: "device", category: "watch", slug: parts[1], q };
    if (parts[0] === "phones") return { name: "category", category: "phone", q };
    if (parts[0] === "tablets") return { name: "category", category: "tablet", q };
    if (parts[0] === "watches") return { name: "category", category: "watch", q };
    if (parts[0] === "brands") return { name: "brands", q };
    if (parts[0] === "search") return { name: "search", q };
    if (parts[0] === "compare") return { name: "compare", q };
    if (parts[0] === "recommend") return { name: "recommend", q };
    return { name: "home", q };
  }

  function navigate(path, replace = false) {
    const url = href(path);
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    render();
  }

  function mountChrome(active) {
    const nav = [
      ["Phones", "/phones"],
      ["Tablets", "/tablets"],
      ["Watches", "/watches"],
      ["Brands", "/brands"],
      ["Recommend", "/recommend"],
      ["Compare", "/compare"],
    ];
    $("#site-header").innerHTML = `
      <a class="brand brand-logo" href="${href("/")}" data-link aria-label="Circuit Media home">
        <img src="${asset("circuit-media-mark.png")}" alt="Circuit Media" class="brand-logo-img" width="44" height="44" />
        <span class="brand-wordmark">Circuit Media</span>
      </a>
      <nav class="primary-nav" id="primary-nav" aria-label="Main">
        ${nav
          .map(([label, path]) => {
            const key = path.slice(1);
            const cur = active === key ? ' aria-current="page"' : "";
            return `<a href="${href(path)}" data-link${cur}>${label}</a>`;
          })
          .join("")}
        <a href="${href("/search")}" data-link class="mobile-search-link">Search</a>
      </nav>
      <div class="header-actions">
        <a class="ghost-button" href="${href("/search")}" data-link>Search</a>
        <a class="primary-button" href="${href("/recommend")}" data-link>Get started</a>
        <button class="menu-button" type="button" id="menu-button" aria-expanded="false">Menu</button>
      </div>`;
    const menu = $("#menu-button");
    const primary = $("#primary-nav");
    menu?.addEventListener("click", () => {
      const open = primary.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "Close" : "Menu";
    });

    const year = new Date().getFullYear();
    const stats = state.data?.stats;
    $("#site-footer").innerHTML = `
      <div class="footer-brand">
        <a class="brand brand-logo" href="${href("/")}" data-link>
          <img src="${asset("circuit-media-logo.png")}" alt="Circuit Media" class="brand-logo-img footer-logo-img" width="72" height="72" />
        </a>
        <p>Full Circuit Media research experience running client-side on GitHub Pages — ${stats?.devices ?? "—"} devices across ${stats?.brands ?? "—"} brands.</p>
        <small class="footer-tagline">Real Context. Smarter Tech Choices.</small>
      </div>
      <div>
        <h3>Explore</h3>
        <a href="${href("/phones")}" data-link>Phones</a>
        <a href="${href("/tablets")}" data-link>Tablets</a>
        <a href="${href("/watches")}" data-link>Watches</a>
        <a href="${href("/brands")}" data-link>Brands</a>
        <a href="${href("/recommend")}" data-link>Recommend</a>
        <a href="${href("/compare")}" data-link>Compare</a>
      </div>
      <div>
        <h3>Tools</h3>
        <a href="${href("/search")}" data-link>Search</a>
        <a href="${href("/compare")}" data-link>Compare</a>
      </div>
      <div>
        <h3>Source</h3>
        <a href="https://github.com/Circuit-bit/Circuit_Media" rel="noopener">GitHub repo</a>
      </div>
      <div class="footer-base">
        <span>© ${year} Circuit Media</span>
        <span>github.io/Circuit_Media</span>
        <a href="mailto:hello@circuit-media-review.com">hello@circuit-media-review.com</a>
      </div>`;
  }

  function deviceCard(device) {
    const photo = device.imageUrl
      ? `<img class="catalog-photo" src="${esc(device.imageUrl)}" alt="${esc(device.brand)} ${esc(device.model)}" loading="lazy" referrerpolicy="no-referrer" />`
      : `<div class="catalog-photo-fallback ${esc(device.category)}"><span>▯</span></div>`;
    const path = `/${categoryPath(device.category)}/${device.slug}`;
    return `
      <article class="device-card catalog-device-card">
        <a class="device-card-visual" href="${href(path)}" data-link aria-label="Open ${esc(device.brand)} ${esc(device.model)}">${photo}</a>
        <div class="device-card-body">
          <div class="eyebrow-row"><span>${esc(device.brand)}</span><strong>${Number(device.score).toFixed(1)}</strong></div>
          <h3><a href="${href(path)}" data-link>${esc(device.model)}</a></h3>
          <p>${esc(device.summary)}</p>
          <div class="device-card-meta">
            <span>${esc(priceOf(device))}</span>
            <span>${esc(yearOf(device))}</span>
          </div>
          <div class="card-actions">
            <a class="text-link" href="${href(path)}" data-link>Specs &amp; photos <span>↗</span></a>
            <button type="button" class="compare-add" data-compare="${esc(device.id)}">+ Compare</button>
          </div>
        </div>
      </article>`;
  }

  function bindCompareButtons(root) {
    root.querySelectorAll("[data-compare]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-compare");
        if (!state.compareIds.includes(id)) {
          if (state.compareIds.length >= 4) state.compareIds.shift();
          state.compareIds.push(id);
        }
        localStorage.setItem("cm-compare", JSON.stringify(state.compareIds));
        navigate(`/compare?devices=${state.compareIds.join(",")}`);
      });
    });
  }

  /* -------- search / recommend (client) -------- */
  function normalize(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9.+]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function compact(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function searchDevices(filters) {
    const tokens = normalize(filters.query || "").split(/\s+/).filter(Boolean);
    let result = state.data.devices.filter((device) => {
      if (filters.category && filters.category !== "all" && device.category !== filters.category) return false;
      if (filters.brand && filters.brand !== "all" && device.brand !== filters.brand) return false;
      if (typeof filters.maxPrice === "number" && (device.startingPrice == null || device.startingPrice > filters.maxPrice)) return false;
      if (!tokens.length) return true;
      const title = normalize([device.brand, device.model, device.category, device.summary, ...(device.bestFor || [])].join(" "));
      const titlePacked = compact(`${device.brand} ${device.model}`);
      const specs = normalize(
        (device.specifications || []).flatMap((g) => g.items.flatMap((i) => [i.label, i.value])).join(" "),
      );
      return tokens.every(
        (token) => title.includes(token) || titlePacked.includes(compact(token)) || specs.includes(token),
      );
    });
    result = result.slice().sort((a, b) => {
      if (filters.sort === "score") return b.score - a.score;
      if (filters.sort === "newest") return String(b.releaseDate).localeCompare(String(a.releaseDate));
      if (filters.sort === "price-low") return (a.startingPrice ?? 1e12) - (b.startingPrice ?? 1e12);
      return b.popularity - a.popularity;
    });
    return result;
  }

  function passesMustHave(features, id) {
    if (!features) return false;
    const map = {
      "5g": features.has5g,
      nfc: features.hasNfc,
      jack: features.hasJack,
      water: features.waterResistant,
      wireless: features.wirelessCharging,
      sdcard: features.cardSlot,
      telephoto: features.hasTelephoto,
      esim: features.hasEsim,
    };
    return Boolean(map[id]);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }
  function scale(value, min, max, missing = 0.3) {
    return value == null ? missing : clamp01((value - min) / (max - min));
  }

  function criterionValues(device, features) {
    const scores = device.componentScores || { performance: 4, display: 4, camera: 4, battery: 4, build: 4 };
    const currentYear = new Date().getFullYear();
    const isWatch = device.category === "watch";
    const value = device.startingPrice
      ? clamp01(device.score / Math.max(120, device.startingPrice) / 0.02)
      : 0.25;
    return {
      performance: scores.performance / 10,
      display: scores.display / 10,
      camera: scores.camera / 10,
      zoom: features.hasPeriscope ? 1 : features.hasTelephoto ? 0.7 : 0.1,
      battery: scores.battery / 10,
      charging: scale(features.chargeWatts, 10, 120),
      portability: isWatch
        ? 0.7
        : clamp01(1 - scale(features.weightGrams, 150, 260, 0.5)) * 0.6 +
          clamp01(1 - scale(features.displayInches, 5.8, 7, 0.5)) * 0.4,
      durability:
        (features.waterResistant ? 0.5 : features.ipRating ? 0.3 : 0) +
        (features.premiumBuild ? 0.3 : 0.1) +
        0.15,
      value,
      recency: features.releaseYear ? clamp01(1 - (currentYear - features.releaseYear) / 4) : 0.2,
      fitness:
        (features.hasGps ? 0.45 : 0) +
        (features.sensors ? Math.min(0.35, features.sensors.split(",").length * 0.07) : 0) +
        (features.waterResistant ? 0.2 : 0),
      productivity:
        (features.stylusSupport ? 0.3 : 0) +
        (features.hasEsim ? 0.15 : 0) +
        (features.hasNfc ? 0.15 : 0) +
        scale(features.maxRamGb, 4, 16) * 0.4,
    };
  }

  function fact(criterion, device, features) {
    switch (criterion) {
      case "performance":
        return features.chipset
          ? `${String(features.chipset).split("(")[0].trim()}${features.maxRamGb ? ` with up to ${features.maxRamGb}GB RAM` : ""}`
          : null;
      case "display":
        return features.displayInches
          ? `${features.displayInches}″ ${features.isOled ? "OLED" : features.displayPanel}${features.refreshHz > 60 ? ` at ${features.refreshHz}Hz` : ""}`
          : null;
      case "camera":
        return features.mainCameraMp
          ? `${features.mainCameraMp}MP camera${features.hasOis ? " with OIS" : ""}`
          : null;
      case "zoom":
        return features.hasPeriscope ? "Periscope telephoto" : features.hasTelephoto ? "Dedicated telephoto" : null;
      case "battery":
        return features.batteryMah ? `${features.batteryMah.toLocaleString()} mAh battery` : null;
      case "charging":
        return features.chargeWatts ? `${features.chargeWatts}W charging` : null;
      case "portability":
        return features.weightGrams ? `${features.weightGrams}g` : null;
      case "durability":
        return features.ipRating || (features.premiumBuild ? "Premium build" : null);
      case "value":
        return device.startingPrice ? `Scores ${device.score.toFixed(1)} at $${device.startingPrice}` : null;
      case "recency":
        return features.releaseYear ? `Released ${features.releaseYear}` : null;
      case "fitness":
        return features.hasGps ? "Built-in GPS" : null;
      case "productivity":
        return features.stylusSupport ? "Stylus support" : features.maxRamGb ? `${features.maxRamGb}GB RAM` : null;
      default:
        return null;
    }
  }

  function recommend(query) {
    const scenario =
      state.data.scenarios.find((s) => s.id === query.scenario) || state.data.scenarios[0];
    const currentYear = new Date().getFullYear();
    const wantedBrands = (query.brands || []).map((b) => b.toLowerCase()).filter(Boolean);
    const pool = state.data.devices.filter((device) => {
      if (query.category && query.category !== "all" && device.category !== query.category) return false;
      if (!query.category || query.category === "all") {
        if (!scenario.categories.includes(device.category)) return false;
      }
      if (wantedBrands.length && !wantedBrands.includes(device.brand.toLowerCase())) return false;
      const features = device.features;
      if (!features) return false;
      if (typeof query.budgetMax === "number" && query.budgetMax > 0) {
        if (device.startingPrice == null || device.startingPrice > query.budgetMax) return false;
      }
      if (!query.includeOlder && features.releaseYear && currentYear - features.releaseYear > 3) return false;
      for (const req of query.mustHave || []) {
        if (!passesMustHave(features, req)) return false;
      }
      return true;
    });
    const entries = Object.entries(scenario.weights);
    const ranked = pool
      .map((device) => {
        const features = device.features;
        const values = criterionValues(device, features);
        let total = 0;
        const breakdown = entries.map(([criterion, weight]) => {
          const score = values[criterion] ?? 0;
          total += score * weight;
          return { criterion, weight, score: Math.round(score * 100) / 100 };
        });
        const reasons = breakdown
          .slice()
          .sort((a, b) => b.weight * b.score - a.weight * a.score)
          .map((e) => fact(e.criterion, device, features))
          .filter(Boolean)
          .slice(0, 3);
        return { device, score: Math.round(total * 1000) / 10, reasons, breakdown };
      })
      .sort((a, b) => b.score - a.score);
    return {
      scenario,
      total: state.data.devices.length,
      considered: pool.length,
      recommendations: ranked.slice(0, query.limit || 8),
    };
  }

  /* -------- pages -------- */
  function pageHome() {
    const { stats, devices } = state.data;
    const popular = devices.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 4);
    const latest = devices.slice().sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate))).slice(0, 3);
    return `
      <main>
        <section class="hero shell">
          <div class="hero-copy">
            <p class="hero-eyebrow">Smartphone · Tech Review · Community</p>
            <h1>Circuit Media<span>Real context for smarter tech choices.</span></h1>
            <p>Browse ${stats.devices.toLocaleString()} phones, tablets and watches across ${stats.brands} brands — with explainable recommendations, all running here on GitHub Pages.</p>
            <div class="hero-actions">
              <a class="primary-button" href="${href("/recommend")}" data-link>Get started →</a>
              <a class="soft-button" href="${href("/compare")}" data-link>How compare works</a>
            </div>
            <form class="search-box" id="home-search">
              <span aria-hidden="true">⌕</span>
              <input name="q" placeholder="Search Galaxy, iPhone, Pixel…" autocomplete="off" />
              <button type="submit">Search</button>
            </form>
          </div>
          <div class="hero-visual">
            <div class="hero-visual-frame">
              <picture>
                <source srcset="${asset("hero-device.webp")}" type="image/webp" />
                <img src="${asset("hero-device.png")}" alt="Flagship phones" width="1001" height="496" />
              </picture>
            </div>
            <div class="hero-float-card">
              <strong>${stats.brands}+ brands</strong>
              <span>${stats.devices.toLocaleString()} devices in catalog</span>
            </div>
          </div>
        </section>
        <section class="quick-categories shell" aria-label="Browse">
          <a href="${href("/phones")}" data-link><span class="category-glyph phone-glyph">▯</span><div><strong>Smartphones</strong><small>${stats.phones} devices</small></div><b>↗</b></a>
          <a href="${href("/tablets")}" data-link><span class="category-glyph tablet-glyph">▭</span><div><strong>Tablets</strong><small>${stats.tablets} devices</small></div><b>↗</b></a>
          <a href="${href("/watches")}" data-link><span class="category-glyph watch-glyph">◉</span><div><strong>Smartwatches</strong><small>${stats.watches} devices</small></div><b>↗</b></a>
          <a href="${href("/brands")}" data-link><span class="category-glyph phone-glyph">▦</span><div><strong>All brands</strong><small>${stats.brands} manufacturers</small></div><b>↗</b></a>
        </section>
        <section class="content-section shell">
          <div class="section-heading"><div><span class="section-kicker">Trending now</span><h2>What people are researching</h2><p>Ranked by catalog popularity.</p></div>
          <a class="outline-button" href="${href("/search?sort=popular")}" data-link>See all</a></div>
          <div class="device-grid four">${popular.map(deviceCard).join("")}</div>
        </section>
        <section class="compare-band">
          <div class="shell compare-band-inner">
            <div class="compare-copy">
              <span class="section-kicker">Decision engine</span>
              <h2>Tell us how you use it.<br />We’ll shortlist it.</h2>
              <p>Pick a use case, set a budget, and get ranked picks with the exact spec evidence behind each score.</p>
              <a class="primary-button" href="${href("/recommend")}" data-link>Get my recommendation <span>↗</span></a>
            </div>
            <div class="comparison-preview">
              <div class="preview-heading"><span>Recommendation</span><span>Photography · under $1,100</span></div>
              <div class="preview-products">
                <div><strong>${esc(popular[0]?.brand || "Device")} ${esc(popular[0]?.model || "")}</strong><small>Catalog record</small></div>
                <div class="versus">VS</div>
                <div><strong>${esc(popular[1]?.brand || "Device")} ${esc(popular[1]?.model || "")}</strong><small>Catalog record</small></div>
              </div>
              <div class="preview-row"><span>Why</span><b>Weighted scoring</b><b class="winner">Explainable facts</b></div>
              <small class="preview-disclaimer">Runs entirely in your browser on this Pages site.</small>
            </div>
          </div>
        </section>
        <section class="content-section shell" style="padding-bottom:110px">
          <div class="section-heading"><div><span class="section-kicker">Just landed</span><h2>Latest releases</h2></div></div>
          <div class="device-grid three">${latest.map((d) => deviceCard(d)).join("")}</div>
        </section>
      </main>`;
  }

  function pageCategory(category) {
    const label = category === "phone" ? "Phones" : category === "tablet" ? "Tablets" : "Watches";
    const heroClass =
      category === "tablet" ? "category-hero category-tablet" : category === "watch" ? "category-hero category-watch" : "category-hero";
    const list = searchDevices({ category, sort: "popular" });
    return `
      <main>
        <section class="${heroClass}"><div class="shell">
          <h1>${label}</h1>
          <p>Full ${label.toLowerCase()} catalog on GitHub Pages — search, open specs, compare, and recommend.</p>
          <div class="category-meta"><span>${list.length} devices</span><span>Client-side catalog</span></div>
        </div></section>
        <section class="catalog shell">
          <div class="device-grid three" id="cat-grid">${list.slice(0, 60).map(deviceCard).join("")}</div>
          ${list.length > 60 ? `<div class="catalog-pagination"><button type="button" id="show-more" data-shown="60">Show more</button><span>${list.length} total</span></div>` : ""}
        </section>
      </main>`;
  }

  function pageBrands() {
    const counts = {};
    for (const d of state.data.devices) counts[d.brand] = (counts[d.brand] || 0) + 1;
    return `
      <main>
        <section class="category-hero"><div class="shell">
          <h1>Brands</h1>
          <p>${state.data.brands.length} manufacturers in the Circuit Media catalog.</p>
        </div></section>
        <section class="catalog shell">
          <div class="brand-directory">
            ${state.data.brands
              .map(
                (brand) =>
                  `<a class="brand-tile" href="${href(`/search?brand=${encodeURIComponent(brand)}`)}" data-link><strong>${esc(brand)}</strong><span>${counts[brand]} devices</span><b>↗</b></a>`,
              )
              .join("")}
          </div>
        </section>
      </main>`;
  }

  function pageSearch(q) {
    const filters = {
      query: q.q || "",
      category: q.category || "all",
      brand: q.brand || "all",
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
      sort: q.sort || "popular",
    };
    const results = searchDevices(filters);
    return `
      <main>
        <section class="search-hero"><div class="shell">
          <h1>Search</h1>
          <form class="search-box" id="search-form">
            <span aria-hidden="true">⌕</span>
            <input name="q" value="${esc(filters.query)}" placeholder="Search devices…" />
            <button type="submit">Search</button>
          </form>
        </div></section>
        <section class="search-layout shell">
          <aside>
            <form id="filter-form">
              <label>Category
                <select name="category">
                  ${["all", "phone", "tablet", "watch"]
                    .map((c) => `<option value="${c}" ${filters.category === c ? "selected" : ""}>${c}</option>`)
                    .join("")}
                </select>
              </label>
              <label>Brand
                <select name="brand">
                  <option value="all">All brands</option>
                  ${state.data.brands
                    .map((b) => `<option value="${esc(b)}" ${filters.brand === b ? "selected" : ""}>${esc(b)}</option>`)
                    .join("")}
                </select>
              </label>
              <label>Max price
                <select name="maxPrice">
                  <option value="">Any</option>
                  ${[300, 500, 750, 1000, 1500]
                    .map((p) => `<option value="${p}" ${String(filters.maxPrice) === String(p) ? "selected" : ""}>Under $${p}</option>`)
                    .join("")}
                </select>
              </label>
              <label>Sort
                <select name="sort">
                  ${[
                    ["popular", "Popular"],
                    ["score", "Score"],
                    ["newest", "Newest"],
                    ["price-low", "Price"],
                  ]
                    .map(([v, l]) => `<option value="${v}" ${filters.sort === v ? "selected" : ""}>${l}</option>`)
                    .join("")}
                </select>
              </label>
              <button type="submit">Apply filters</button>
            </form>
          </aside>
          <div class="search-results">
            <div class="result-heading"><h2>${results.length.toLocaleString()} results</h2></div>
            <div class="device-grid three">${results.slice(0, 48).map(deviceCard).join("") || `<div class="empty-state"><span>⌀</span><p>No devices matched.</p></div>`}</div>
          </div>
        </section>
      </main>`;
  }

  function pageDevice(route) {
    const device = state.data.devices.find((d) => d.slug === route.slug && d.category === route.category);
    if (!device) {
      return `<main class="status-page"><span>404</span><h1>Device not found</h1><p>That slug isn’t in the Pages catalog.</p><a class="lime-button" href="${href("/search")}" data-link>Search devices</a></main>`;
    }
    const path = categoryPath(device.category);
    const scores = device.componentScores || {};
    const related = state.data.devices
      .filter((d) => d.brand === device.brand && d.id !== device.id && d.category === device.category)
      .slice(0, 3);
    return `
      <main>
        <div class="shell breadcrumbs"><a href="${href("/")}" data-link>Home</a><span>/</span><a href="${href(`/${path}`)}" data-link>${path}</a><span>/</span><strong>${esc(device.model)}</strong></div>
        <section class="shell product-hero">
          <div class="product-visual-panel live-product-visual">
            ${
              device.imageUrl
                ? `<img class="product-hero-photo" src="${esc(device.imageUrl)}" alt="${esc(device.brand)} ${esc(device.model)}" referrerpolicy="no-referrer" />`
                : `<div class="catalog-photo-fallback ${esc(device.category)}"><span>▯</span></div>`
            }
          </div>
          <div class="product-intro">
            <div class="product-badges"><span class="verified-chip">Catalog verified</span><span>${esc(device.brand)}</span></div>
            <h1>${esc(device.brand)} ${esc(device.model)}</h1>
            <p>${esc(device.summary)}</p>
            <div class="score-price">
              <div><strong>${Number(device.score).toFixed(1)}</strong><span>Score</span></div>
              <div><strong>${esc(priceOf(device))}</strong><span>Starting price</span></div>
            </div>
            <div class="product-actions">
              <button type="button" class="primary-button" data-compare="${esc(device.id)}">+ Compare</button>
              <a class="ghost-button" href="${href("/recommend")}" data-link>Get recommendation</a>
            </div>
            <div class="score-bars">
              ${["performance", "display", "camera", "battery", "build"]
                .map((k) => {
                  const v = scores[k] ?? 0;
                  return `<div class="score-bar-row"><span>${k}</span><div class="score-bar-track"><i style="width:${v * 10}%"></i></div><b>${Number(v).toFixed(1)}</b></div>`;
                })
                .join("")}
            </div>
          </div>
        </section>
        <section class="shell product-overview">
          <article class="ai-summary">
            <div class="ai-label"><span>CM</span><strong>Overview</strong><small>From sourced specifications</small></div>
            <h2>Why it stands out</h2>
            <p>${esc(device.summary)}</p>
            <div class="best-for">${(device.bestFor || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          </article>
          <aside class="pros-cons">
            <div><span class="pros-icon">+</span><ul>${(device.pros || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>
            <div><span class="cons-icon">−</span><ul>${(device.cons || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
          </aside>
        </section>
        <section class="shell spec-section">
          <div class="spec-heading"><h2>Specs</h2><p>Key specification groups from the seeded catalog.</p></div>
          <div class="spec-groups">
            ${(device.specifications || [])
              .map(
                (g) => `
              <details open>
                <summary>${esc(g.name)} <b>${g.items.length} fields</b></summary>
                ${g.items
                  .map(
                    (item) =>
                      `<div class="spec-row"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong><span>verified</span></div>`,
                  )
                  .join("")}
              </details>`,
              )
              .join("")}
          </div>
        </section>
        ${
          related.length
            ? `<section class="shell related-section"><div class="section-heading"><div><span class="section-kicker">More from ${esc(device.brand)}</span><h2>Related</h2></div></div><div class="device-grid three">${related.map(deviceCard).join("")}</div></section>`
            : ""
        }
      </main>`;
  }

  function pageCompare(q) {
    const ids = (q.devices || state.compareIds.join(",") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    state.compareIds = ids;
    localStorage.setItem("cm-compare", JSON.stringify(ids));
    const picked = ids.map((id) => state.data.devices.find((d) => d.id === id || d.slug === id)).filter(Boolean);
    while (picked.length < 2) picked.push(null);
    const rows = [
      ["Score", (d) => d.score.toFixed(1)],
      ["Price", (d) => priceOf(d)],
      ["Released", (d) => yearOf(d)],
      ["Chipset", (d) => d.features?.chipset || "—"],
      ["Display", (d) => (d.features?.displayInches ? `${d.features.displayInches}″` : "—")],
      ["Battery", (d) => (d.features?.batteryMah ? `${d.features.batteryMah} mAh` : "—")],
      ["Camera", (d) => (d.features?.mainCameraMp ? `${d.features.mainCameraMp} MP` : "—")],
    ];
    return `
      <main>
        <section class="compare-page-hero"><div class="shell">
          <h1>Compare <mark>side by side</mark></h1>
          <p>Pick up to four devices from the catalog.</p>
        </div></section>
        <section class="compare-workspace shell">
          <div class="compare-table" style="--compare-count:${Math.max(picked.length, 2)}">
            <div class="compare-corner"><strong>Spec</strong><span>GitHub Pages compare</span></div>
            ${picked
              .map((d, i) => {
                if (!d) {
                  return `<div class="compare-product compare-product-draft">
                    <div class="compare-photo compare-photo-empty">+</div>
                    <form data-add-compare="${i}" class="compare-search">
                      <div class="compare-search-field"><span>⌕</span><input name="q" placeholder="Add device…" /></div>
                    </form>
                  </div>`;
                }
                return `<div class="compare-product">
                  <div class="compare-photo">${d.imageUrl ? `<img src="${esc(d.imageUrl)}" alt="" referrerpolicy="no-referrer" />` : ""}</div>
                  <strong>${esc(d.score.toFixed(1))}</strong>
                  <small>${esc(d.brand)}</small>
                  <b>${esc(d.model)}</b>
                  <button type="button" data-remove-compare="${esc(d.id)}">Remove</button>
                </div>`;
              })
              .join("")}
            ${rows
              .map(
                ([label, fn]) => `
              <div class="compare-row" style="grid-column:1/-1;display:grid;grid-template-columns:210px repeat(${Math.max(picked.length, 2)},minmax(190px,1fr));border-top:1px solid var(--line)">
                <div style="padding:16px 20px;background:var(--surface-2)"><small>${esc(label)}</small></div>
                ${picked
                  .map((d) => `<div style="padding:16px 20px;border-left:1px solid var(--line)"><span>${d ? esc(fn(d)) : "—"}</span></div>`)
                  .join("")}
              </div>`,
              )
              .join("")}
          </div>
          <p style="margin-top:24px"><a class="text-link" href="${href("/search")}" data-link>Browse catalog to add devices ↗</a></p>
        </section>
      </main>`;
  }

  function pageRecommend() {
    const scenarios = state.data.scenarios;
    const mustHaves = state.data.mustHaves;
    return `
      <main>
        <section class="recommend-hero"><div class="shell">
          <h1>Get a <mark>recommendation</mark></h1>
          <p>Explainable ranking over the full Pages catalog — same weighting ideas as production.</p>
        </div></section>
        <section class="recommend-workspace shell">
          <form class="recommend-panel" id="recommend-form">
            <div class="recommend-step">
              <div class="recommend-step-number">1</div>
              <div>
                <h2>Category</h2>
                <div class="chip-row" id="rec-category">
                  ${[
                    ["all", "Anything"],
                    ["phone", "Smartphone"],
                    ["tablet", "Tablet"],
                    ["watch", "Smartwatch"],
                  ]
                    .map(
                      ([id, label], i) =>
                        `<button type="button" class="chip ${i === 0 ? "active" : ""}" data-cat="${id}">${label}</button>`,
                    )
                    .join("")}
                </div>
              </div>
            </div>
            <div class="recommend-step">
              <div class="recommend-step-number">2</div>
              <div>
                <h2>Use case</h2>
                <div class="scenario-grid" id="rec-scenarios">
                  ${scenarios
                    .map(
                      (s) =>
                        `<button type="button" class="scenario-card" data-scenario="${esc(s.id)}" data-cats="${esc(s.categories.join(","))}"><strong>${esc(s.label)}</strong><span>${esc(s.description)}</span></button>`,
                    )
                    .join("")}
                </div>
              </div>
            </div>
            <div class="recommend-step">
              <div class="recommend-step-number">3</div>
              <div>
                <h2>Budget &amp; must-haves</h2>
                <div class="recommend-controls">
                  <label>Budget
                    <select name="budget">
                      <option value="">Any budget</option>
                      ${[200, 350, 500, 750, 1000, 1500]
                        .map((p) => `<option value="${p}">Under $${p}</option>`)
                        .join("")}
                    </select>
                  </label>
                </div>
                <h3>Must-haves</h3>
                <div class="chip-row" id="rec-must">
                  ${mustHaves
                    .map((m) => `<button type="button" class="chip" data-must="${esc(m.id)}" data-cats="${esc(m.categories.join(","))}">${esc(m.label)}</button>`)
                    .join("")}
                </div>
                <div class="recommend-submit" style="margin-top:22px">
                  <button class="lime-button" type="submit" id="rec-submit" disabled>Rank devices ↗</button>
                  <span class="recommend-error" id="rec-error"></span>
                </div>
              </div>
            </div>
          </form>
          <div class="recommend-results" id="rec-results" hidden></div>
        </section>
      </main>`;
  }

  function bindPage(route) {
    const root = $("#app-root");
    bindCompareButtons(root);

    $("#home-search")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new FormData(e.target).get("q");
      navigate(`/search?q=${encodeURIComponent(String(q || ""))}`);
    });

    $("#search-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new FormData(e.target).get("q");
      const params = new URLSearchParams(location.search);
      params.set("q", String(q || ""));
      navigate(`/search?${params.toString()}`);
    });

    $("#filter-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const params = new URLSearchParams(location.search);
      for (const [k, v] of fd.entries()) {
        if (v) params.set(k, String(v));
        else params.delete(k);
      }
      const q = $("#search-form input[name=q]")?.value;
      if (q) params.set("q", q);
      navigate(`/search?${params.toString()}`);
    });

    $("#show-more")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const shown = Number(btn.getAttribute("data-shown") || "60");
      const list = searchDevices({ category: route.category, sort: "popular" });
      const next = Math.min(shown + 60, list.length);
      $("#cat-grid").innerHTML = list.slice(0, next).map(deviceCard).join("");
      bindCompareButtons(root);
      btn.setAttribute("data-shown", String(next));
      if (next >= list.length) btn.remove();
    });

    root.querySelectorAll("[data-remove-compare]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove-compare");
        state.compareIds = state.compareIds.filter((x) => x !== id);
        localStorage.setItem("cm-compare", JSON.stringify(state.compareIds));
        navigate(`/compare?devices=${state.compareIds.join(",")}`);
      });
    });

    root.querySelectorAll("[data-add-compare]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = new FormData(form).get("q");
        const hit = searchDevices({ query: String(q || ""), sort: "popular" })[0];
        if (!hit) return;
        if (!state.compareIds.includes(hit.id)) state.compareIds.push(hit.id);
        state.compareIds = state.compareIds.slice(0, 4);
        localStorage.setItem("cm-compare", JSON.stringify(state.compareIds));
        navigate(`/compare?devices=${state.compareIds.join(",")}`);
      });
    });

    // Recommend UI
    let selectedScenario = "";
    let selectedCategory = "all";
    const selectedMust = new Set();
    const syncRec = () => {
      root.querySelectorAll("#rec-scenarios .scenario-card").forEach((card) => {
        const cats = (card.getAttribute("data-cats") || "").split(",");
        const visible = selectedCategory === "all" || cats.includes(selectedCategory);
        card.style.display = visible ? "" : "none";
        card.classList.toggle("active", card.getAttribute("data-scenario") === selectedScenario);
      });
      root.querySelectorAll("#rec-must .chip").forEach((chip) => {
        const cats = (chip.getAttribute("data-cats") || "").split(",");
        chip.style.display = selectedCategory === "all" || cats.includes(selectedCategory) ? "" : "none";
        chip.classList.toggle("active", selectedMust.has(chip.getAttribute("data-must")));
      });
      $("#rec-submit").disabled = !selectedScenario;
    };
    root.querySelectorAll("#rec-category .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedCategory = chip.getAttribute("data-cat");
        root.querySelectorAll("#rec-category .chip").forEach((c) => c.classList.toggle("active", c === chip));
        selectedScenario = "";
        syncRec();
      });
    });
    root.querySelectorAll("#rec-scenarios .scenario-card").forEach((card) => {
      card.addEventListener("click", () => {
        selectedScenario = card.getAttribute("data-scenario");
        syncRec();
      });
    });
    root.querySelectorAll("#rec-must .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.getAttribute("data-must");
        if (selectedMust.has(id)) selectedMust.delete(id);
        else selectedMust.add(id);
        syncRec();
      });
    });
    $("#recommend-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!selectedScenario) return;
      const budgetRaw = new FormData(e.target).get("budget");
      const result = recommend({
        scenario: selectedScenario,
        category: selectedCategory,
        budgetMax: budgetRaw ? Number(budgetRaw) : null,
        mustHave: [...selectedMust],
        limit: 8,
      });
      const box = $("#rec-results");
      box.hidden = false;
      box.innerHTML = `
        <div class="recommend-results-heading">
          <div><span class="section-kicker">${esc(result.scenario.label)}</span><h2>${result.recommendations.length} ranked picks</h2>
          <p style="color:var(--muted)">${result.considered} devices considered of ${result.total}.</p></div>
        </div>
        <div class="recommend-list">
          ${result.recommendations
            .map(
              (rec, i) => `
            <article class="recommend-card">
              <div class="recommend-rank">#${i + 1}</div>
              <div class="recommend-photo">${rec.device.imageUrl ? `<img src="${esc(rec.device.imageUrl)}" alt="" referrerpolicy="no-referrer" />` : ""}</div>
              <div class="recommend-card-body">
                <h3><a href="${href(`/${categoryPath(rec.device.category)}/${rec.device.slug}`)}" data-link>${esc(rec.device.brand)} ${esc(rec.device.model)}</a></h3>
                <div class="fit-score"><div class="score-bar-track"><i style="width:${Math.min(100, rec.score)}%"></i></div><b>Fit ${rec.score}</b></div>
                <ul class="recommend-reasons">${rec.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
              </div>
            </article>`,
            )
            .join("") || `<p class="recommend-error">No devices matched those filters.</p>`}
        </div>`;
      bindCompareButtons(box);
    });
    if ($("#recommend-form")) syncRec();
  }

  function render() {
    if (!state.data) return;
    const route = parseRoute();
    const active =
      route.name === "category"
        ? categoryPath(route.category)
        : route.name === "device"
          ? categoryPath(route.category)
          : route.name === "home"
            ? ""
            : route.name;
    mountChrome(active);
    document.title =
      route.name === "home"
        ? "Circuit Media"
        : `${route.name[0].toUpperCase()}${route.name.slice(1)} | Circuit Media`;

    let html = "";
    if (route.name === "home") html = pageHome();
    else if (route.name === "category") html = pageCategory(route.category);
    else if (route.name === "brands") html = pageBrands();
    else if (route.name === "search") html = pageSearch(route.q);
    else if (route.name === "device") html = pageDevice(route);
    else if (route.name === "compare") html = pageCompare(route.q);
    else if (route.name === "recommend") html = pageRecommend();
    else html = pageHome();

    $("#app-root").innerHTML = html;
    bindPage(route);
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-link]");
    if (!a) return;
    const url = new URL(a.href, location.origin);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    history.pushState(null, "", url.pathname + url.search + url.hash);
    render();
  });

  window.addEventListener("popstate", render);

  async function boot() {
    try {
      const res = await fetch(`${BASE}/data/catalog.json`);
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      state.data = await res.json();
      render();
    } catch (err) {
      $("#app-root").innerHTML = `<main class="status-page"><span>!</span><h1>Catalog failed to load</h1><p>${esc(err.message)}</p></main>`;
    }
  }

  boot();
})();
