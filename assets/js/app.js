(() => {
  const base = window.CM_BASE || "";
  const api = (path, options = {}) =>
    fetch(base + path, {
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
      return data;
    });

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const categoryPath = (category) =>
    category === "tablet" ? "tablets" : category === "watch" ? "watches" : "phones";

  const deviceHref = (device) =>
    `${base}/${categoryPath(device.category || "phone")}/${encodeURIComponent(device.slug || device.id || "")}`;

  const money = (value) =>
    value == null || value === "" ? "Price varies" : `From $${Number(value).toLocaleString()}`;

  const showcaseSrc = (category) => {
    const file =
      category === "tablet"
        ? "showcase-tablet.png"
        : category === "watch"
          ? "showcase-watch.png"
          : "showcase-phone.png";
    return `${base}/assets/img/${file}`;
  };

  const menuBtn = document.querySelector("[data-menu-toggle]");
  const nav = document.getElementById("primary-nav");
  const backdrop = document.querySelector("[data-menu-close]");
  const setOpen = (open) => {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.textContent = open ? "Close" : "Menu";
    if (backdrop) backdrop.hidden = !open;
    document.documentElement.classList.toggle("nav-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  menuBtn?.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  backdrop?.addEventListener("click", () => setOpen(false));

  /* ——— Recommend ——— */
  const recommendForm = document.getElementById("recommend-form");
  const recommendOut = document.getElementById("recommend-results");
  const recommendError = document.getElementById("recommend-error");
  const recommendSubmit = document.getElementById("recommend-submit");

  const syncChipActive = (root = recommendForm) => {
    root?.querySelectorAll(".chip, .scenario-card").forEach((el) => {
      const input = el.querySelector("input");
      el.classList.toggle("active", !!input?.checked);
    });
  };

  const selectedScenario = () => {
    const input = recommendForm?.querySelector('input[name="scenario"]:checked');
    return input
      ? { id: input.value, label: input.dataset.label || input.value }
      : null;
  };

  const syncRecommendCta = () => {
    if (!recommendSubmit) return;
    const scenario = selectedScenario();
    recommendSubmit.disabled = !scenario;
    recommendSubmit.textContent = scenario
      ? `Recommend for ${String(scenario.label).toLowerCase()} ↗`
      : "Pick a use case first";
  };

  const syncRecommendFilters = () => {
    if (!recommendForm) return;
    const category = String(new FormData(recommendForm).get("category") || "all");
    recommendForm.querySelectorAll(".scenario-card").forEach((card) => {
      const input = card.querySelector('input[name="scenario"]');
      const cats = String(input?.dataset.categories || "")
        .split(",")
        .filter(Boolean);
      const visible = category === "all" || cats.includes(category);
      card.hidden = !visible;
      if (!visible && input?.checked) input.checked = false;
    });
    recommendForm.querySelectorAll("[data-must-categories]").forEach((chip) => {
      const cats = String(chip.dataset.mustCategories || "")
        .split(",")
        .filter(Boolean);
      chip.hidden = !(category === "all" || cats.includes(category));
      if (chip.hidden) {
        const box = chip.querySelector('input[type="checkbox"]');
        if (box) box.checked = false;
      }
    });
    syncChipActive();
    syncRecommendCta();
  };

  recommendForm?.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
    if (event.target.name === "category") {
      // Changing category clears the use-case so CTA resets like workers.dev.
      recommendForm.querySelectorAll('input[name="scenario"]').forEach((el) => {
        el.checked = false;
      });
      if (recommendOut) {
        recommendOut.hidden = true;
        recommendOut.innerHTML = "";
      }
      syncRecommendFilters();
      return;
    }
    syncChipActive();
    syncRecommendCta();
  });

  syncRecommendFilters();

  recommendForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(recommendForm);
    const scenario = fd.get("scenario");
    if (!scenario) {
      if (recommendError) {
        recommendError.hidden = false;
        recommendError.textContent = "Pick a use case first.";
      }
      return;
    }
    const body = {
      scenario,
      category: fd.get("category") || "all",
      budgetMax: fd.get("budgetMax") ? Number(fd.get("budgetMax")) : null,
      mustHave: fd.getAll("mustHave"),
      brands: fd.getAll("brands"),
      includeOlder: fd.get("includeOlder") === "on",
      limit: 8,
    };
    if (recommendError) recommendError.hidden = true;
    if (recommendSubmit) {
      recommendSubmit.disabled = true;
      recommendSubmit.textContent = "Analyzing the catalog…";
    }
    recommendOut.hidden = false;
    recommendOut.innerHTML = `<p class="recommend-loading">Scoring the catalog…</p>`;
    try {
      const payload = await api("/api/recommend", { method: "POST", body: JSON.stringify(body) });
      const data = payload.data || {};
      const rows = data.recommendations || [];
      const scenarioLabel = data.scenario?.label || selectedScenario()?.label || body.scenario;
      const narrative = data.narrative || payload.meta?.ai?.summary || payload.meta?.ai?.narrative || null;
      const narrativeHtml = narrative
        ? `<div class="ai-narrative"><span>AI</span><p>${esc(String(narrative))}</p></div>`
        : "";
      if (!rows.length) {
        recommendOut.innerHTML = `
          <div class="recommend-results-heading">
            <div>
              <span class="section-kicker">Ranked for ${esc(String(scenarioLabel).toLowerCase())}</span>
              <h2>No devices matched</h2>
            </div>
            <div class="catalog-count"><strong>${Number(data.considered || 0).toLocaleString()}</strong><span>devices considered</span></div>
          </div>
          ${narrativeHtml}
          <div class="empty-state">
            <span aria-hidden="true">⌕</span>
            <h2>Nothing fits those limits</h2>
            <p>Try widening the budget, removing a must-have, or including older devices.</p>
          </div>`;
        return;
      }
      recommendOut.innerHTML = `
        <div class="recommend-results-heading">
          <div>
            <span class="section-kicker">Ranked for ${esc(String(scenarioLabel).toLowerCase())}</span>
            <h2>Your top ${rows.length} picks</h2>
          </div>
          <div class="catalog-count"><strong>${Number(data.considered || 0).toLocaleString()}</strong><span>devices considered</span></div>
        </div>
        ${narrativeHtml}
        <div class="recommend-list">
          ${rows
            .map((row, index) => {
              const d = row.device || {};
              const img = d.image?.url
                ? `<img src="${esc(d.image.url)}" alt="${esc(`${d.brand || ""} ${d.model || ""}`)}" loading="lazy" />`
                : `<img class="catalog-photo-showcase" src="${esc(showcaseSrc(d.category || "phone"))}" alt="" aria-hidden="true" loading="lazy" />`;
              const topTwo = rows.slice(0, 2).map((item) => item.device?.id).filter(Boolean);
              const compareIds = topTwo.includes(d.id)
                ? topTwo
                : [d.id, rows[0]?.device?.id].filter(Boolean);
              const uniqueCompare = [...new Set(compareIds)].slice(0, 2).join(",");
              return `<article class="recommend-card">
                <span class="recommend-rank">#${index + 1}</span>
                <a class="recommend-photo" href="${esc(deviceHref(d))}">${img}</a>
                <div class="recommend-card-body">
                  <div class="eyebrow-row"><span>${esc(d.brand || "")}</span><small>${esc(money(d.startingPrice))}</small></div>
                  <h3><a href="${esc(deviceHref(d))}">${esc(d.model || d.id || "Device")}</a></h3>
                  <div class="fit-score">
                    <div class="score-bar-track"><i style="width:${Math.min(100, Number(row.score) || 0)}%"></i></div>
                    <b>${Math.round(Number(row.score) || 0)}/100 fit</b>
                  </div>
                  <ul class="recommend-reasons">${(row.reasons || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
                  <div class="card-actions">
                    <a class="text-link" href="${esc(deviceHref(d))}">Full specs &amp; photos <span>↗</span></a>
                    <a class="compare-add" href="${esc(`${base}/compare?devices=${encodeURIComponent(uniqueCompare)}`)}">+ Compare</a>
                  </div>
                </div>
              </article>`;
            })
            .join("")}
        </div>`;
      recommendOut.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      recommendOut.innerHTML = "";
      recommendOut.hidden = true;
      if (recommendError) {
        recommendError.hidden = false;
        recommendError.textContent = "The recommendation engine is temporarily unavailable. Please try again.";
      }
    } finally {
      syncRecommendCta();
    }
  });

  /* ——— Compare (workers.dev parity) ——— */
  const compareRoot = document.querySelector("[data-cm-compare]");
  const compareTable = document.getElementById("compare-table");
  const compareError = document.getElementById("compare-error");
  const PRIORITY_META = {
    camera: "Camera",
    battery: "Battery",
    performance: "Gaming",
    display: "Display",
    build: "Durability",
    value: "Value",
  };

  if (compareRoot && compareTable) {
    const readCompareBootstrap = () => {
      const el = document.getElementById("compare-bootstrap");
      if (!el) return {};
      try {
        return JSON.parse(el.textContent || "{}") || {};
      } catch {
        return {};
      }
    };

    const bootstrap = readCompareBootstrap();
    let compareOptions = Array.isArray(bootstrap.options) ? bootstrap.options : [];
    const initialDevices = Array.isArray(bootstrap.initialDevices) ? bootstrap.initialDevices : [];
    const deviceMap = Object.fromEntries(initialDevices.filter((d) => d?.id).map((d) => [d.id, d]));
    let selectedIds = initialDevices.map((d) => d.id).filter(Boolean).slice(0, 4);
    let activePriority = "camera";
    let activePriorityLabel = "Camera";
    let loadingId = null;
    let draftOpen = false;
    let searchTimer = null;
    let openPickerKey = null;

    const labelOf = (option) => `${option?.brand || ""} ${option?.model || ""}`.trim();

    const rememberOption = (item) => {
      if (!item?.id) return;
      if (!compareOptions.some((o) => o.id === item.id)) {
        compareOptions.push({
          id: item.id,
          brand: item.brand || "",
          model: item.model || "",
          category: item.category || "phone",
        });
      }
    };

    for (const device of initialDevices) rememberOption(device);

    const normalizeRemote = (device) => ({
      id: device.id || device.slug || device.sourceSlug,
      brand: device.brand,
      model: device.model,
      category: device.category,
    });

    const priorityScore = (device, key) => {
      if (!device) return null;
      if (key === "value") {
        if (!device.startingPrice) return null;
        return Math.round((Number(device.score || 0) / Number(device.startingPrice)) * 1000) / 10;
      }
      const scores = device.componentScores || {};
      return scores[key] == null ? null : Number(scores[key]);
    };

    const flatSpecs = (device) => {
      const map = new Map();
      for (const group of device?.specifications || []) {
        const groupName = group.name || group.group || "";
        for (const item of group.items || []) {
          map.set(`${groupName}:${item.label}`, { ...item, group: groupName });
        }
      }
      return map;
    };

    const syncShareLink = () => {
      const shareBtn = document.getElementById("compare-share");
      if (!shareBtn) return;
      shareBtn.onclick = async () => {
        const url = `${location.origin}${base}/compare?devices=${encodeURIComponent(selectedIds.join(","))}`;
        try {
          await navigator.clipboard.writeText(url);
          shareBtn.textContent = "Link copied ✓";
          setTimeout(() => {
            shareBtn.textContent = "Copy shareable view ↗";
          }, 1600);
        } catch {
          window.prompt("Copy this compare link", url);
        }
      };
    };

    const selectedDevices = () => selectedIds.map((id) => deviceMap[id]).filter(Boolean);

    const searchLocal = (needle, excludeIds = []) => {
      const q = needle.trim().toLowerCase();
      const blocked = new Set(excludeIds.filter(Boolean));
      const pool = compareOptions.filter((o) => o.id && !blocked.has(o.id));
      if (!q) return pool.filter((o) => o.category === "phone").slice(0, 8);
      return pool
        .filter((o) => {
          const hay = `${labelOf(o)} ${o.id}`.toLowerCase();
          return q.split(/\s+/).every((token) => hay.includes(token));
        })
        .slice(0, 10);
    };

    const pickerMarkup = (key, current, excludeIds) => {
      const open = openPickerKey === key;
      const query = open ? compareRoot.dataset.searchQuery || "" : "";
      const searching = compareRoot.dataset.searching === key;
      let remote = [];
      try {
        remote = JSON.parse(compareRoot.dataset.remoteHits || "[]");
      } catch {
        remote = [];
      }
      const localHits = searchLocal(open ? query : "", excludeIds);
      const seen = new Set(localHits.map((item) => item.id));
      const merged = [...localHits];
      for (const item of remote) {
        if (!item?.id || seen.has(item.id) || excludeIds.includes(item.id)) continue;
        if (current && item.id === current.id) continue;
        seen.add(item.id);
        merged.push(item);
      }
      const suggestions = merged.slice(0, 12);
      const inputValue = open || !current ? query : labelOf(current);
      return `<div class="compare-search ${open ? "is-open" : ""}" data-search-root data-picker-key="${esc(key)}">
        <div class="compare-search-field">
          <span aria-hidden="true">⌕</span>
          <input type="search" role="combobox" aria-expanded="${open ? "true" : "false"}"
            autocomplete="off" ${loadingId ? "disabled" : ""}
            placeholder="${current ? esc(labelOf(current)) : "Search brand or model"}"
            value="${esc(inputValue)}" data-picker-input="${esc(key)}" />
        </div>
        ${
          open
            ? `<ul class="compare-search-results" role="listbox">
                ${
                  suggestions.length
                    ? suggestions
                        .map(
                          (o) => `<li><button type="button" role="option" data-pick-id="${esc(o.id)}" data-pick-key="${esc(key)}">
                            <strong>${esc(o.model || o.id)}</strong>
                            <small>${esc(o.brand || "")} · ${esc(o.category || "device")}</small>
                          </button></li>`
                        )
                        .join("")
                    : `<li class="compare-search-empty">${
                        searching
                          ? "Searching live catalog…"
                          : query.trim()
                            ? "No matching devices"
                            : "Type a brand or model"
                      }</li>`
                }
              </ul>`
            : ""
        }
      </div>`;
    };

    const renderTable = () => {
      const devices = selectedDevices();
      const count = devices.length + (draftOpen && devices.length < 4 ? 1 : 0);
      compareTable.style.setProperty("--compare-count", String(Math.max(count, 1)));

      const scores = devices.map((d) => priorityScore(d, activePriority));
      const bestScore = Math.max(...scores.map((s) => s ?? -1), -1);
      const winnerIndex = bestScore > 0 ? scores.findIndex((s) => s === bestScore) : -1;
      const winner = winnerIndex >= 0 ? devices[winnerIndex] : null;

      const maps = devices.map(flatSpecs);
      const rowKeys = [...new Set(maps.flatMap((map) => [...map.keys()]))];
      const rows = rowKeys.map((key) => ({
        key,
        group: key.split(":")[0],
        label: key.split(":").slice(1).join(":"),
        values: maps.map((map) => map.get(key)),
      }));

      const products = devices
        .map((device, index) => {
          const img = device.image?.url
            ? `<img src="${esc(device.image.url)}" alt="${esc(`${device.brand || ""} ${device.model || ""}`)}" loading="lazy" />`
            : `<div class="device-visual" style="--device-accent:${esc(device.accent || "#ff7a3d")}"></div>`;
          return `<div class="compare-product ${index === winnerIndex ? "priority-winner" : ""}" data-device-col="${index}">
            <div class="compare-photo">${img}</div>
            ${pickerMarkup(`slot-${index}`, device, selectedIds.filter((_, i) => i !== index))}
            <strong>${device.score != null ? Number(device.score).toFixed(1) : "—"}</strong>
            <small>${esc(money(device.startingPrice))}</small>
            ${
              devices.length > 2
                ? `<button type="button" class="compare-draft-cancel" data-remove-id="${esc(device.id)}">Remove</button>`
                : ""
            }
          </div>`;
        })
        .join("");

      const draft =
        draftOpen && devices.length < 4
          ? `<div class="compare-product compare-product-draft">
              <div class="compare-photo compare-photo-empty" aria-hidden="true"><span>⌕</span></div>
              ${pickerMarkup("draft", null, selectedIds)}
              <button type="button" class="compare-draft-cancel" data-cancel-draft>Cancel</button>
            </div>`
          : "";

      const addBtn =
        devices.length < 4 && !draftOpen
          ? `<button class="add-compare-column" type="button" id="compare-add-slot" ${loadingId ? "disabled" : ""}>
              <span>+</span>${loadingId ? "Loading…" : "Add device"}
            </button>`
          : "";

      const verdict = winner
        ? `<strong>Best for ${esc(activePriorityLabel.toLowerCase())}: ${esc(winner.brand || "")} ${esc(winner.model || "")}</strong>
           <span>${
             activePriority === "value"
               ? `Highest capability per dollar at $${Number(winner.startingPrice).toLocaleString()} for a ${Number(winner.score || 0).toFixed(1)}/10 analysis score.`
               : `Leads this group with a ${esc(activePriorityLabel.toLowerCase())} component score of ${Number(
                   winner.componentScores?.[activePriority] ?? 0
                 ).toFixed(1)}/10, computed from the published specification record.`
           }</span>`
        : `<strong>Not enough evidence for a ${esc(activePriorityLabel.toLowerCase())} verdict.</strong>
           <span>One or more of these devices is missing the data needed to score this priority (for example, an unlisted regional price).</span>`;

      compareTable.innerHTML = `
        <div class="compare-corner"><strong>${devices.length} devices</strong><span>Search to pick 2–4 models</span></div>
        ${products}
        ${draft}
        ${addBtn}
        <div class="recommendation-label"><span>AI</span><strong>Priority verdict</strong></div>
        <div class="recommendation-content" style="grid-column: 2 / span ${Math.max(devices.length, 1)}">${verdict}</div>
        ${rows
          .map(
            (row, rowIndex) => `<div class="compare-row-wrap" style="grid-column: 1 / span ${devices.length + 1}">
              <div class="compare-row" style="--compare-count:${devices.length}">
                <div><small>${esc(row.group)}</small><strong>${esc(row.label)}</strong></div>
                ${row.values
                  .map(
                    (value) =>
                      `<div><span>${esc(value?.value ?? "Not listed")}</span><small>${value ? "✓ Sourced" : "—"}</small></div>`
                  )
                  .join("")}
              </div>
              ${rowIndex === 0 ? `<span class="difference-key">All fields shown as published</span>` : ""}
            </div>`
          )
          .join("")}`;

      syncShareLink();
      if (compareError) compareError.hidden = true;
      if (openPickerKey) {
        const input = compareTable.querySelector(`[data-picker-input="${openPickerKey}"]`);
        if (input) {
          input.value = compareRoot.dataset.searchQuery || "";
          input.focus();
        }
        updateOpenPickerResults();
      }
    };

    const loadDevice = async (id) => {
      if (deviceMap[id]) return deviceMap[id];
      loadingId = id;
      renderTable();
      try {
        const payload = await api(`/api/devices/${encodeURIComponent(id)}`);
        const device = payload.data;
        if (!device?.id) return null;
        deviceMap[id] = device;
        deviceMap[device.id] = device;
        rememberOption(device);
        return device;
      } catch {
        return null;
      } finally {
        loadingId = null;
      }
    };

    const updateSlot = async (index, id) => {
      const loaded = await loadDevice(id);
      if (!loaded) {
        if (compareError) {
          compareError.hidden = false;
          compareError.textContent = "Could not load that device. Try another model.";
        }
        renderTable();
        return;
      }
      selectedIds = selectedIds.map((item, itemIndex) => (itemIndex === index ? loaded.id : item));
      selectedIds = selectedIds.filter((item, itemIndex, array) => array.indexOf(item) === itemIndex);
      openPickerKey = null;
      compareRoot.dataset.searchQuery = "";
      compareRoot.dataset.remoteHits = "[]";
      history.replaceState({}, "", `${base}/compare?devices=${encodeURIComponent(selectedIds.join(","))}`);
      renderTable();
    };

    const addDevice = async (id) => {
      if (selectedIds.length >= 4) return;
      const loaded = await loadDevice(id);
      if (!loaded) {
        if (compareError) {
          compareError.hidden = false;
          compareError.textContent = "Could not load that device. Try another model.";
        }
        renderTable();
        return;
      }
      if (!selectedIds.includes(loaded.id)) selectedIds = [...selectedIds, loaded.id].slice(0, 4);
      draftOpen = false;
      openPickerKey = null;
      compareRoot.dataset.searchQuery = "";
      compareRoot.dataset.remoteHits = "[]";
      history.replaceState({}, "", `${base}/compare?devices=${encodeURIComponent(selectedIds.join(","))}`);
      renderTable();
    };

    const excludeForKey = (key) => {
      if (key === "draft") return [...selectedIds];
      if (key.startsWith("slot-")) {
        const index = Number(key.slice(5));
        return selectedIds.filter((_, i) => i !== index);
      }
      return [...selectedIds];
    };

    const currentForKey = (key) => {
      if (!key.startsWith("slot-")) return null;
      const index = Number(key.slice(5));
      return deviceMap[selectedIds[index]] || null;
    };

    const buildSuggestions = (key) => {
      const query = compareRoot.dataset.searchQuery || "";
      const excludeIds = excludeForKey(key);
      const current = currentForKey(key);
      let remote = [];
      try {
        remote = JSON.parse(compareRoot.dataset.remoteHits || "[]");
      } catch {
        remote = [];
      }
      const localHits = searchLocal(query, excludeIds);
      const seen = new Set(localHits.map((item) => item.id));
      const merged = [...localHits];
      for (const item of remote) {
        if (!item?.id || seen.has(item.id) || excludeIds.includes(item.id)) continue;
        if (current && item.id === current.id) continue;
        seen.add(item.id);
        merged.push(item);
      }
      return merged.slice(0, 12);
    };

    const updateOpenPickerResults = () => {
      if (!openPickerKey) return;
      const root = compareTable.querySelector(`[data-picker-key="${CSS.escape(openPickerKey)}"]`);
      if (!root) return;
      root.classList.add("is-open");
      const input = root.querySelector("[data-picker-input]");
      if (input) input.setAttribute("aria-expanded", "true");
      let list = root.querySelector(".compare-search-results");
      if (!list) {
        list = document.createElement("ul");
        list.className = "compare-search-results";
        list.setAttribute("role", "listbox");
        root.appendChild(list);
      }
      const query = compareRoot.dataset.searchQuery || "";
      const searching = compareRoot.dataset.searching === openPickerKey;
      const suggestions = buildSuggestions(openPickerKey);
      if (!suggestions.length) {
        list.innerHTML = `<li class="compare-search-empty">${
          searching ? "Searching live catalog…" : query.trim() ? "No matching devices" : "Type a brand or model"
        }</li>`;
        return;
      }
      list.innerHTML = suggestions
        .map(
          (o) => `<li><button type="button" role="option" data-pick-id="${esc(o.id)}" data-pick-key="${esc(openPickerKey)}">
            <strong>${esc(o.model || o.id)}</strong>
            <small>${esc(o.brand || "")} · ${esc(o.category || "device")}</small>
          </button></li>`
        )
        .join("");
    };

    const closeOpenPicker = () => {
      if (!openPickerKey) return;
      const root = compareTable.querySelector(`[data-picker-key="${CSS.escape(openPickerKey)}"]`);
      if (root) {
        root.classList.remove("is-open");
        const input = root.querySelector("[data-picker-input]");
        const current = currentForKey(openPickerKey);
        if (input) {
          input.setAttribute("aria-expanded", "false");
          input.value = current ? labelOf(current) : "";
        }
        root.querySelector(".compare-search-results")?.remove();
      }
      openPickerKey = null;
      compareRoot.dataset.searchQuery = "";
      compareRoot.dataset.remoteHits = "[]";
      compareRoot.dataset.searching = "";
    };

    const runRemoteSearch = (key, needle) => {
      clearTimeout(searchTimer);
      if (needle.trim().length < 2) {
        compareRoot.dataset.remoteHits = "[]";
        compareRoot.dataset.searching = "";
        if (openPickerKey === key) updateOpenPickerResults();
        return;
      }
      compareRoot.dataset.searching = key;
      if (openPickerKey === key) updateOpenPickerResults();
      searchTimer = setTimeout(async () => {
        try {
          // Prefer catalog ids, then live hits (same merge as API default).
          const payload = await api(`/api/search?q=${encodeURIComponent(needle.trim())}&limit=12`);
          const remote = (payload.data || []).map(normalizeRemote).filter((item) => item.id);
          for (const item of remote) rememberOption(item);
          compareRoot.dataset.remoteHits = JSON.stringify(remote);
        } catch {
          // Fall back to local catalog-only search if live search fails on host.
          try {
            const payload = await api(`/api/search?q=${encodeURIComponent(needle.trim())}&limit=12&source=catalog`);
            const remote = (payload.data || []).map(normalizeRemote).filter((item) => item.id);
            for (const item of remote) rememberOption(item);
            compareRoot.dataset.remoteHits = JSON.stringify(remote);
          } catch {
            compareRoot.dataset.remoteHits = "[]";
          }
        } finally {
          if (compareRoot.dataset.searching === key) compareRoot.dataset.searching = "";
          if (openPickerKey === key) updateOpenPickerResults();
        }
      }, 220);
    };

    compareRoot.addEventListener("focusin", (event) => {
      const input = event.target.closest("[data-picker-input]");
      if (!input) return;
      openPickerKey = input.dataset.pickerInput;
      compareRoot.dataset.searchQuery = "";
      compareRoot.dataset.remoteHits = "[]";
      input.value = "";
      updateOpenPickerResults();
    });

    compareRoot.addEventListener("input", (event) => {
      const input = event.target.closest("[data-picker-input]");
      if (!input) return;
      openPickerKey = input.dataset.pickerInput;
      compareRoot.dataset.searchQuery = input.value;
      updateOpenPickerResults();
      runRemoteSearch(openPickerKey, input.value);
    });

    compareRoot.addEventListener("keydown", (event) => {
      const input = event.target.closest("[data-picker-input]");
      if (!input) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeOpenPicker();
      }
      if (event.key === "Enter") {
        const first = compareRoot.querySelector("[data-pick-id]");
        if (first) {
          event.preventDefault();
          first.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        }
      }
    });

    // Use mousedown so picks register before blur/close (workers.dev pattern).
    compareRoot.addEventListener("mousedown", (event) => {
      const pick = event.target.closest("[data-pick-id]");
      if (pick) {
        event.preventDefault();
        const key = pick.dataset.pickKey || "";
        const id = pick.getAttribute("data-pick-id");
        if (!id) return;
        if (key === "draft") addDevice(id);
        else if (key.startsWith("slot-")) updateSlot(Number(key.slice(5)), id);
        return;
      }
      if (event.target.closest("#compare-add-slot")) {
        draftOpen = true;
        openPickerKey = "draft";
        compareRoot.dataset.searchQuery = "";
        compareRoot.dataset.remoteHits = "[]";
        renderTable();
        return;
      }
      if (event.target.closest("[data-cancel-draft]")) {
        draftOpen = false;
        openPickerKey = null;
        renderTable();
        return;
      }
      const remove = event.target.closest("[data-remove-id]");
      if (remove) {
        const id = remove.getAttribute("data-remove-id");
        selectedIds = selectedIds.filter((item) => item !== id);
        history.replaceState({}, "", `${base}/compare?devices=${encodeURIComponent(selectedIds.join(","))}`);
        renderTable();
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (!openPickerKey) return;
      if (event.target.closest("[data-search-root]") || event.target.closest("[data-pick-id]")) return;
      closeOpenPicker();
    });

    document.getElementById("compare-priorities")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-priority]");
      if (!btn) return;
      activePriority = btn.dataset.priority;
      activePriorityLabel = btn.dataset.label || PRIORITY_META[activePriority] || activePriority;
      document.querySelectorAll("#compare-priorities [data-priority]").forEach((el) => {
        el.classList.toggle("active", el === btn);
      });
      renderTable();
    });

    api("/api/devices?category=phone&limit=48&source=catalog")
      .then((payload) => {
        for (const device of payload.data || []) rememberOption(normalizeRemote(device));
      })
      .catch(() => {});

    renderTable();
  }

  /* ——— Reviews / admin (unchanged behavior) ——— */
  const reviewForm = document.getElementById("user-review-form");
  reviewForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(reviewForm);
    const status = reviewForm.querySelector(".form-status");
    try {
      await api("/api/user-reviews", {
        method: "POST",
        body: JSON.stringify({
          deviceId: reviewForm.dataset.deviceId,
          rating: Number(fd.get("rating")),
          title: fd.get("title"),
          body: fd.get("body"),
          website: fd.get("website") || "",
        }),
      });
      if (status) {
        status.hidden = false;
        status.textContent = "Thanks — your review is pending moderation.";
      }
      reviewForm.reset();
    } catch (err) {
      if (status) {
        status.hidden = false;
        status.textContent = err.message;
      }
    }
  });

  const importForm = document.getElementById("admin-import-form");
  importForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(importForm);
    const out = document.getElementById("admin-import-out");
    try {
      const payload = await api("/api/admin/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${fd.get("token")}` },
        body: JSON.stringify({
          provider: fd.get("provider"),
          fullRefresh: fd.get("fullRefresh") === "on",
        }),
      });
      if (out) {
        out.hidden = false;
        out.textContent = JSON.stringify(payload, null, 2);
      }
    } catch (err) {
      if (out) {
        out.hidden = false;
        out.textContent = err.message;
      }
    }
  });

  const verifyForm = document.getElementById("admin-verify-form");
  verifyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(verifyForm);
    const out = document.getElementById("admin-verify-out");
    try {
      const payload = await api("/api/admin/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${fd.get("token")}` },
        body: JSON.stringify({
          deviceId: fd.get("deviceId"),
          fieldPath: fd.get("fieldPath"),
          sourceId: fd.get("sourceId"),
          status: fd.get("status"),
          note: fd.get("note"),
        }),
      });
      if (out) {
        out.hidden = false;
        out.textContent = JSON.stringify(payload, null, 2);
      }
    } catch (err) {
      if (out) {
        out.hidden = false;
        out.textContent = err.message;
      }
    }
  });

  const lightboxRoot = (() => {
    const existing = document.getElementById("cm-lightbox");
    if (existing) return existing;
    const el = document.createElement("div");
    el.id = "cm-lightbox";
    el.className = "cm-lightbox";
    el.hidden = true;
    el.innerHTML = `
      <button type="button" class="cm-lightbox-backdrop" data-lightbox-close aria-label="Close photo"></button>
      <div class="cm-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Product photo">
        <button type="button" class="cm-lightbox-close" data-lightbox-close aria-label="Close">×</button>
        <img alt="" />
      </div>`;
    document.body.appendChild(el);
    return el;
  })();

  const lightboxImg = lightboxRoot.querySelector("img");
  const openLightbox = (src, alt = "") => {
    if (!src || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightboxRoot.hidden = false;
    document.documentElement.classList.add("lightbox-open");
  };
  const closeLightbox = () => {
    lightboxRoot.hidden = true;
    document.documentElement.classList.remove("lightbox-open");
    if (lightboxImg) lightboxImg.removeAttribute("src");
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-lightbox-src]");
    if (trigger) {
      event.preventDefault();
      openLightbox(trigger.getAttribute("data-lightbox-src"), trigger.getAttribute("data-lightbox-alt") || "");
      return;
    }
    if (event.target.closest("[data-lightbox-close]")) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightboxRoot.hidden) closeLightbox();
  });

})();
