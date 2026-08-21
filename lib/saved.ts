import { MVP_DISCOVERABLE_KINDS, type MvpDiscoverableKind } from "@/lib/types";

export const SAVED_STORAGE_KEY = "veya:saved:v1";
export const SAVED_EVENT = "veya:saved-change";

export type SavedReference = {
  slug: string;
  kind: MvpDiscoverableKind;
};

export function readSaved(): SavedReference[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SAVED_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedReference =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as SavedReference).slug === "string" &&
            typeof (item as SavedReference).kind === "string" &&
            MVP_DISCOVERABLE_KINDS.includes((item as SavedReference).kind),
        ),
    );
  } catch {
    return [];
  }
}

export function writeSaved(items: SavedReference[]) {
  window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: items }));
}
