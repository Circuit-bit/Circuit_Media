"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentScores, Device } from "../../lib/types";
import { DevicePhoto } from "../device/DevicePhoto";

export type DeviceOption = {
  id: string;
  brand: string;
  model: string;
  category: Device["category"];
};

const PRIORITIES: Array<{ label: string; key: keyof ComponentScores | "value" }> = [
  { label: "Camera", key: "camera" },
  { label: "Battery", key: "battery" },
  { label: "Gaming", key: "performance" },
  { label: "Display", key: "display" },
  { label: "Durability", key: "build" },
  { label: "Value", key: "value" },
];

function flatSpecs(device: Device) {
  return new Map(device.specifications.flatMap((group) => group.items.map((item) => [`${group.name}:${item.label}`, { ...item, group: group.name }] as const)));
}

function priorityScore(device: Device, key: keyof ComponentScores | "value"): number | null {
  if (key === "value") {
    if (!device.startingPrice) return null;
    return Math.round((device.score / device.startingPrice) * 1000) / 10;
  }
  return device.componentScores?.[key] ?? null;
}

function labelOf(option: DeviceOption) {
  return `${option.brand} ${option.model}`.trim();
}

function DeviceSearchPicker({
  label,
  current,
  options,
  selectedIds,
  disabled,
  onPick,
}: {
  label: string;
  current?: DeviceOption | null;
  options: DeviceOption[];
  selectedIds: string[];
  disabled?: boolean;
  onPick: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<DeviceOption[]>([]);
  const [searching, setSearching] = useState(false);

  const localHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = options.filter((option) => option.id !== current?.id && !selectedIds.includes(option.id));
    if (!needle) return pool.slice(0, 8);
    return pool
      .filter((option) => labelOf(option).toLowerCase().includes(needle) || option.id.toLowerCase().includes(needle))
      .slice(0, 10);
  }, [options, query, selectedIds, current?.id]);

  const suggestions = useMemo(() => {
    const seen = new Set(localHits.map((item) => item.id));
    const merged = [...localHits];
    for (const item of remote) {
      if (seen.has(item.id) || selectedIds.includes(item.id) || item.id === current?.id) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged.slice(0, 12);
  }, [localHits, remote, selectedIds, current?.id]);

  useEffect(() => {
    const needle = query.trim();
    if (!open || needle.length < 2) {
      setRemote([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(needle)}&limit=12`, { signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json() as { data: Array<{ id: string; brand: string; model: string; category: Device["category"]; sourceSlug?: string; slug?: string }> };
        setRemote(
          (payload.data ?? []).map((device) => ({
            id: device.sourceSlug || device.slug || device.id,
            brand: device.brand,
            model: device.model,
            category: device.category,
          })),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRemote([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className={`compare-search ${open ? "is-open" : ""}`} ref={rootRef}>
      <label className="sr-only" htmlFor={label}>{current ? `Change ${labelOf(current)}` : "Search for a device"}</label>
      <div className="compare-search-field">
        <span aria-hidden="true">⌕</span>
        <input
          id={label}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${label}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={current ? labelOf(current) : "Search brand or model"}
          value={open || !current ? query : labelOf(current)}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              onPick(suggestions[0].id);
              setOpen(false);
              setQuery("");
            }
          }}
        />
      </div>
      {open && (
        <ul className="compare-search-results" id={`${label}-list`} role="listbox">
          {suggestions.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(option.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <strong>{option.model}</strong>
                <small>{option.brand} · {option.category}</small>
              </button>
            </li>
          ))}
          {!suggestions.length && (
            <li className="compare-search-empty">{searching ? "Searching live catalog…" : query.trim() ? "No matching devices" : "Type a brand or model"}</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function CompareClient({ options, initialDevices }: { options: DeviceOption[]; initialDevices: Device[] }) {
  const [deviceMap, setDeviceMap] = useState<Record<string, Device>>(() =>
    Object.fromEntries(initialDevices.map((device) => [device.id, device])));
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialDevices.map((device) => device.id));
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>(PRIORITIES[0]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);

  const selected = selectedIds.map((id) => deviceMap[id]).filter(Boolean);
  const maps = selected.map(flatSpecs);
  const rows = useMemo(
    () => [...new Set(maps.flatMap((map) => [...map.keys()]))].map((key) => ({ key, group: key.split(":")[0], label: key.split(":")[1], values: maps.map((map) => map.get(key)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, deviceMap],
  );
  const shareUrl = `/compare?devices=${selectedIds.join(",")}`;

  const scores = selected.map((device) => priorityScore(device, priority.key));
  const bestScore = Math.max(...scores.map((score) => score ?? -1));
  const winnerIndex = bestScore > 0 ? scores.findIndex((score) => score === bestScore) : -1;
  const winner = winnerIndex >= 0 ? selected[winnerIndex] : null;

  async function load(id: string): Promise<Device | null> {
    if (deviceMap[id]) return deviceMap[id];
    setLoadingId(id);
    try {
      const response = await fetch(`/api/devices/${encodeURIComponent(id)}`);
      if (!response.ok) return null;
      const payload = await response.json() as { data: Device };
      setDeviceMap((current) => ({ ...current, [id]: payload.data, [payload.data.id]: payload.data }));
      return payload.data;
    } catch {
      return null;
    } finally {
      setLoadingId(null);
    }
  }

  async function update(index: number, id: string) {
    const loaded = await load(id);
    if (!loaded) return;
    const resolvedId = loaded.id;
    setSelectedIds((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? resolvedId : item));
      return next.filter((item, itemIndex, array) => array.indexOf(item) === itemIndex);
    });
  }

  async function addDevice(id: string) {
    if (selectedIds.length >= 4) return;
    const loaded = await load(id);
    if (!loaded) return;
    setSelectedIds((current) => current.includes(loaded.id) ? current : [...current, loaded.id].slice(0, 4));
    setDraftOpen(false);
  }

  return (
    <>
      <div className="priority-bar"><span>What matters most?</span><div>{PRIORITIES.map((item) => <button type="button" className={priority.label === item.label ? "active" : ""} onClick={() => setPriority(item)} key={item.label}>{item.label}</button>)}</div><Link href={shareUrl}>Copy shareable view ↗</Link></div>
      <div className="compare-table" style={{ "--compare-count": selected.length + (draftOpen && selected.length < 4 ? 1 : 0) } as React.CSSProperties}>
        <div className="compare-corner"><strong>{selected.length} devices</strong><span>Search to pick 2–4 models</span></div>
        {selected.map((device, index) => (
          <div className={`compare-product ${index === winnerIndex ? "priority-winner" : ""}`} key={device.id}>
            <div className="compare-photo"><DevicePhoto src={device.image.url} alt={`${device.brand} ${device.model}`} category={device.category} accent={device.accent} /></div>
            <DeviceSearchPicker
              label={`compare-device-${index}`}
              current={{ id: device.id, brand: device.brand, model: device.model, category: device.category }}
              options={options}
              selectedIds={selectedIds}
              disabled={loadingId !== null}
              onPick={(id) => update(index, id)}
            />
            <strong>{device.score ? device.score.toFixed(1) : "—"}</strong>
            <small>{device.startingPrice ? `From $${device.startingPrice.toLocaleString()}` : "Price varies"}</small>
            {selected.length > 2 && <button type="button" onClick={() => setSelectedIds(selectedIds.filter((id) => id !== device.id))}>Remove</button>}
          </div>
        ))}
        {draftOpen && selected.length < 4 && (
          <div className="compare-product compare-product-draft">
            <div className="compare-photo compare-photo-empty" aria-hidden="true"><span>⌕</span></div>
            <DeviceSearchPicker
              label="compare-device-draft"
              current={null}
              options={options}
              selectedIds={selectedIds}
              disabled={loadingId !== null}
              onPick={addDevice}
            />
            <button type="button" className="compare-draft-cancel" onClick={() => setDraftOpen(false)}>Cancel</button>
          </div>
        )}
        {selected.length < 4 && !draftOpen && (
          <button className="add-compare-column" type="button" onClick={() => setDraftOpen(true)} disabled={loadingId !== null}>
            <span>+</span>{loadingId ? "Loading…" : "Add device"}
          </button>
        )}
        <div className="recommendation-label"><span>AI</span><strong>Priority verdict</strong></div>
        <div className="recommendation-content" style={{ gridColumn: `2 / span ${Math.max(selected.length, 1)}` }}>
          {winner ? (
            <>
              <strong>Best for {priority.label.toLowerCase()}: {winner.brand} {winner.model}</strong>
              <span>
                {priority.key === "value"
                  ? `Highest capability per dollar at $${winner.startingPrice?.toLocaleString()} for a ${winner.score.toFixed(1)}/10 analysis score.`
                  : `Leads this group with a ${priority.label.toLowerCase()} component score of ${winner.componentScores?.[priority.key]?.toFixed(1)}/10, computed from the sourced specification record.`}
              </span>
            </>
          ) : (
            <>
              <strong>Not enough evidence for a {priority.label.toLowerCase()} verdict.</strong>
              <span>One or more of these devices is missing the data needed to score this priority (for example, an unlisted regional price).</span>
            </>
          )}
        </div>
        {rows.map((row, rowIndex) => <div className="compare-row-wrap" key={row.key} style={{ gridColumn: `1 / span ${selected.length + 1}` }}><div className="compare-row" style={{ "--compare-count": selected.length } as React.CSSProperties}><div><small>{row.group}</small><strong>{row.label}</strong></div>{row.values.map((value, valueIndex) => <div key={`${row.key}-${valueIndex}`}><span>{value?.value ?? "Not listed"}</span><small>{value ? "✓ Sourced" : "—"}</small></div>)}</div>{rowIndex === 0 && <span className="difference-key">All fields shown as published by the source record</span>}</div>)}
      </div>
    </>
  );
}
