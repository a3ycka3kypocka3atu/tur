"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MvpDiscoverable, MvpDiscoverableKind } from "@/lib/types";
import { pickText, type Locale } from "@/lib/i18n";

type MappableItem = MvpDiscoverable & {
  kind: MvpDiscoverableKind;
  coordinates: { latitude: number; longitude: number };
};

function isMappable(item: MvpDiscoverable): item is MappableItem {
  return "coordinates" in item && Boolean(item.coordinates);
}

export function VeyaMap({ items, locale }: { items: readonly MvpDiscoverable[]; locale: Locale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef(new Map<string, import("leaflet").Marker>());
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mappable = useMemo(() => items.filter(isMappable), [items]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    import("leaflet").then((leafletModule) => {
      if (disposed || !containerRef.current) return;
      const L = leafletModule.default;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 3,
        maxZoom: 14,
      }).setView([41.7, 19.8], 6);

      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      tiles.on("tileerror", () => setTileError(true));
      tiles.addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let disposed = false;

    import("leaflet").then((leafletModule) => {
      if (disposed || !mapRef.current) return;
      const L = leafletModule.default;
      markersRef.current.forEach((marker) => marker.removeFrom(map));
      markersRef.current.clear();

      const bounds: [number, number][] = [];
      mappable.forEach((item) => {
        const position: [number, number] = [item.coordinates.latitude, item.coordinates.longitude];
        bounds.push(position);
        const icon = L.divIcon({
          className: "veya-marker-wrap",
          html: `<span class="veya-marker marker-${item.kind}" aria-hidden="true"></span>`,
          iconSize: [32, 38],
          iconAnchor: [16, 36],
          popupAnchor: [0, -34],
        });
        const marker = L.marker(position, {
          icon,
          keyboard: true,
          title: pickText(item.title, locale),
          alt: pickText(item.title, locale),
        });

        const popup = document.createElement("div");
        popup.className = "map-popup";
        const type = document.createElement("small");
        type.textContent = item.kind;
        const title = document.createElement("strong");
        title.textContent = pickText(item.title, locale);
        const location = document.createElement("span");
        location.textContent = pickText(item.location, locale);
        const link = document.createElement("a");
        link.href = `/${locale}/discover/${item.kind}/${item.slug}`;
        link.textContent = "View details";
        popup.append(type, title, location, link);

        marker.bindPopup(popup);
        marker.on("click", () => setSelectedSlug(item.slug));
        marker.addTo(map);
        markersRef.current.set(item.slug, marker);
      });

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      if (bounds.length === 1) map.setView(bounds[0], 10);
    });

    return () => {
      disposed = true;
    };
  }, [locale, mapReady, mappable]);

  function focusMarker(item: MappableItem) {
    setSelectedSlug(item.slug);
    const marker = markersRef.current.get(item.slug);
    mapRef.current?.setView([item.coordinates.latitude, item.coordinates.longitude], Math.max(mapRef.current.getZoom(), 8), {
      animate: true,
    });
    marker?.openPopup();
  }

  if (mappable.length === 0) {
    return (
      <div className="map-empty">
        <h2>No markers match these filters</h2>
        <p>Change the filters or switch to cards.</p>
      </div>
    );
  }

  return (
    <div className="map-layout">
      <div className="map-canvas-wrap">
        {tileError && (
          <div className="map-warning" role="status">
            The map background is unavailable. Every marker remains available in the list.
          </div>
        )}
        <div ref={containerRef} className="map-canvas" aria-label="Interactive Veya map" />
      </div>
      <div className="map-results" aria-label="Map results">
        {mappable.map((item) => (
          <button
            key={`${item.kind}:${item.slug}`}
            className={selectedSlug === item.slug ? "is-selected" : ""}
            type="button"
            onClick={() => focusMarker(item)}
          >
            <span>{pickText(item.title, locale)}</span>
            <small>{pickText(item.location, locale)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
