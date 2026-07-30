"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchBox({ compact = false, initial = "" }: { compact?: boolean; initial?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form className={compact ? "search-box compact" : "search-box"} onSubmit={submit} role="search">
      <span aria-hidden="true">⌕</span>
      <label className="sr-only" htmlFor={compact ? "compact-device-search" : "device-search"}>Search devices and specifications</label>
      <input
        id={compact ? "compact-device-search" : "device-search"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder=""
        autoComplete="off"
      />
      <button type="submit">Search</button>
    </form>
  );
}
