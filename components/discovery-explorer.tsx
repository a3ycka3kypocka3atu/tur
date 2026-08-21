"use client";

import { useEffect, useMemo, useState } from "react";
import { EntityGrid } from "@/components/entity-card";
import { VeyaMap } from "@/components/veya-map";
import { pickText, type Locale } from "@/lib/i18n";
import type { MvpDiscoverable, MvpDiscoverableKind } from "@/lib/types";

export type DiscoveryView = "cards" | "list" | "map";

const kindLabels = {
  all: "Everything",
  place: "Places",
  journey: "Journeys",
  opportunity: "Opportunities",
  creator: "Creators",
} as const;

export function DiscoveryExplorer({
  items,
  locale,
  initialKind = "all",
  initialView = "cards",
  initialQuery = "",
  initialStyle = "all",
}: {
  items: readonly MvpDiscoverable[];
  locale: Locale;
  initialKind?: MvpDiscoverableKind | "all";
  initialView?: DiscoveryView;
  initialQuery?: string;
  initialStyle?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<MvpDiscoverableKind | "all">(initialKind);
  const [style, setStyle] = useState(initialStyle);
  const [view, setView] = useState<DiscoveryView>(initialView);

  const styles = useMemo(
    () => [...new Set(items.flatMap((item) => item.travelStyleSlugs))].sort(),
    [items],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en");
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (style !== "all" && !item.travelStyleSlugs.includes(style)) return false;
      if (!needle) return true;
      const haystack = [item.title, item.summary, item.description, item.location]
        .map((value) => pickText(value, locale))
        .concat(item.tagSlugs, item.travelStyleSlugs)
        .join(" ")
        .toLocaleLowerCase("en");
      return haystack.includes(needle);
    });
  }, [items, kind, locale, query, style]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    query ? params.set("q", query) : params.delete("q");
    kind !== "all" ? params.set("kind", kind) : params.delete("kind");
    style !== "all" ? params.set("style", style) : params.delete("style");
    view !== "cards" ? params.set("view", view) : params.delete("view");
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }, [kind, query, style, view]);

  function clearFilters() {
    setQuery("");
    setKind("all");
    setStyle("all");
  }

  return (
    <section className="discovery-explorer" aria-labelledby="discovery-results-title">
      <div className="discovery-controls">
        <label className="search-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A place, interest, or possibility"
          />
        </label>

        <label>
          <span>Type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as MvpDiscoverableKind | "all")}
          >
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Travel style</span>
          <select value={style} onChange={(event) => setStyle(event.target.value)}>
            <option value="all">All styles</option>
            {styles.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>

        <button className="filter-clear" type="button" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <div className="discovery-result-bar">
        <p id="discovery-results-title" role="status" aria-live="polite">
          {results.length} {results.length === 1 ? "result" : "results"}
        </p>
        <div className="view-switch" aria-label="Result view">
          {(["cards", "list", "map"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {{ cards: "Cards", list: "List", map: "Map" }[value]}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <h2>No possibilities match yet</h2>
          <p>Clear a filter or try a shorter search.</p>
          <button className="button button-secondary" type="button" onClick={clearFilters}>
            Show everything
          </button>
        </div>
      ) : view === "map" ? (
        <VeyaMap items={results} locale={locale} />
      ) : (
        <div className={view === "list" ? "is-list-view" : ""}>
          <EntityGrid
            items={results}
            locale={locale}
            priorityCount={view === "cards" ? 2 : 0}
          />
        </div>
      )}
    </section>
  );
}
