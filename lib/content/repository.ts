import "server-only";

import { cache } from "react";
import { discoverables as seedDiscoverables, travelStyles } from "@/lib/content/seed";
import { getContentSource, isSupabaseConfigured } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import {
  MVP_DISCOVERABLE_KINDS,
  type ActionMetadata,
  type AllowedAsset,
  type ContentSourceType,
  type LocalizedText,
  type MvpDiscoverable,
  type MvpDiscoverableKind,
  type SourceMetadata,
  type TravelStyle,
} from "@/lib/types";

export type PublicContentSource = "seed" | "supabase";

export interface PublicContentResult {
  readonly items: readonly MvpDiscoverable[];
  readonly source: PublicContentSource;
}

export class PublicContentUnavailableError extends Error {
  constructor() {
    super("Published Veya content could not be loaded.");
    this.name = "PublicContentUnavailableError";
  }
}

const allowedAssets = new Set<AllowedAsset>([
  "/assets/veya-world.png",
  "/assets/albania-coast-road.jpg",
  "/assets/community-hero.jpg",
  "/assets/community-table.png",
]);
const mvpKinds = new Set<string>(MVP_DISCOVERABLE_KINDS);
const sourceTypes = new Set<ContentSourceType>([
  "veya-editorial",
  "veya-concept",
  "partner-call",
  "demo",
]);

type UnknownRecord = Record<string, unknown>;
type PublishedContentRow = {
  kind: MvpDiscoverableKind;
  slug: string;
  title_i18n: LocalizedText;
  summary_i18n: LocalizedText;
  location_name: unknown;
  latitude: unknown;
  longitude: unknown;
  travel_styles: unknown;
  image_urls: unknown;
  payload: UnknownRecord;
  featured: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && isNonEmptyString(value.en);
}

function isAllowedAsset(value: unknown): value is AllowedAsset {
  return typeof value === "string" && allowedAssets.has(value as AllowedAsset);
}

function isSourceMetadata(value: unknown): value is SourceMetadata {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    sourceTypes.has(value.type as ContentSourceType) &&
    isLocalizedText(value.label) &&
    isLocalizedText(value.note) &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function isActionMetadata(value: unknown): value is ActionMetadata {
  return (
    isRecord(value) &&
    ["view-details", "express-interest", "request-information", "partner-call"].includes(
      String(value.type),
    ) &&
    isLocalizedText(value.label) &&
    isNonEmptyString(value.href) &&
    value.href.startsWith("/") &&
    typeof value.external === "boolean"
  );
}

function hasCommonShape(value: UnknownRecord): boolean {
  const media = value.media;
  return (
    typeof value.kind === "string" &&
    mvpKinds.has(value.kind) &&
    isNonEmptyString(value.slug) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.summary) &&
    isLocalizedText(value.description) &&
    isLocalizedText(value.location) &&
    isLocalizedText(value.statusLabel) &&
    isRecord(media) &&
    isAllowedAsset(media.src) &&
    isLocalizedText(media.alt) &&
    isStringArray(value.tagSlugs) &&
    isStringArray(value.travelStyleSlugs) &&
    isStringArray(value.relatedSlugs) &&
    isSourceMetadata(value.source) &&
    Array.isArray(value.actions) &&
    value.actions.length > 0 &&
    value.actions.every(isActionMetadata)
  );
}

function hasCoordinates(value: UnknownRecord): boolean {
  if (!isRecord(value.coordinates)) return false;
  const latitude = value.coordinates.latitude;
  const longitude = value.coordinates.longitude;
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    isLocalizedText(value.coordinateLabel)
  );
}

function localizedList(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isLocalizedText);
}

function isMvpDiscoverable(value: unknown): value is MvpDiscoverable {
  if (!isRecord(value) || !hasCommonShape(value) || !hasCoordinates(value)) return false;

  switch (value.kind) {
    case "place":
      return (
        isNonEmptyString(value.countryCode) &&
        isNonEmptyString(value.category) &&
        isLocalizedText(value.categoryLabel) &&
        ["simple", "flexible", "comfortable"].includes(String(value.comfort)) &&
        isLocalizedText(value.comfortLabel)
      );
    case "journey":
      return (
        ["concept", "gathering-interest", "seeking-partner"].includes(String(value.status)) &&
        isLocalizedText(value.duration) &&
        isLocalizedText(value.groupSize) &&
        isLocalizedText(value.accommodation) &&
        isLocalizedText(value.pace) &&
        isLocalizedText(value.availabilityNotice) &&
        isStringArray(value.routePlaceSlugs)
      );
    case "opportunity":
      return (
        ["concept", "gathering-interest", "partner-call"].includes(String(value.status)) &&
        ["experience", "travel-group", "community", "retreat", "long-stay", "workshop"].includes(
          String(value.category),
        ) &&
        isLocalizedText(value.categoryLabel) &&
        isLocalizedText(value.participationType) &&
        isLocalizedText(value.requirements) &&
        isRecord(value.availability) &&
        ["concept", "gathering-interest", "partner-call"].includes(
          String(value.availability.state),
        ) &&
        isLocalizedText(value.availability.notice) &&
        isNonEmptyString(value.organiserSlug)
      );
    case "creator":
      return (
        ["editorial", "partner-call"].includes(String(value.profileMode)) &&
        localizedList(value.languages) &&
        localizedList(value.specialties) &&
        isLocalizedText(value.profileNotice)
      );
    default:
      return false;
  }
}

const seedItems = seedDiscoverables.filter(isMvpDiscoverable);
const seedByKey = new Map(seedItems.map((item) => [`${item.kind}:${item.slug}`, item] as const));

function isPublishedRow(value: unknown): value is PublishedContentRow {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    mvpKinds.has(value.kind) &&
    isNonEmptyString(value.slug) &&
    isLocalizedText(value.title_i18n) &&
    isLocalizedText(value.summary_i18n) &&
    isRecord(value.payload)
  );
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function materializePublishedRow(row: unknown): MvpDiscoverable | null {
  if (!isPublishedRow(row)) return null;

  const payload = row.payload;
  const embedded = isRecord(payload.discoverable) ? payload.discoverable : payload;
  const fallback = seedByKey.get(`${row.kind}:${row.slug}`);
  const base = isMvpDiscoverable(embedded) ? embedded : fallback;
  if (!base || base.kind !== row.kind || base.slug !== row.slug) return null;

  const latitude = finiteNumber(row.latitude);
  const longitude = finiteNumber(row.longitude);
  if (latitude === null || longitude === null) return null;

  const firstImage = Array.isArray(row.image_urls)
    ? row.image_urls.find(isAllowedAsset)
    : undefined;
  const styles = isStringArray(row.travel_styles) ? row.travel_styles : base.travelStyleSlugs;
  const location = isNonEmptyString(row.location_name)
    ? { en: row.location_name }
    : base.location;

  const candidate = {
    ...base,
    title: row.title_i18n,
    summary: row.summary_i18n,
    location,
    coordinates: { latitude, longitude },
    travelStyleSlugs: styles,
    media: firstImage ? { ...base.media, src: firstImage } : base.media,
    featured: typeof row.featured === "boolean" ? row.featured : base.featured,
  };

  return isMvpDiscoverable(candidate) ? candidate : null;
}

function seedResult(): PublicContentResult {
  return { items: seedItems, source: "seed" };
}

export const getPublicContent = cache(async (): Promise<PublicContentResult> => {
  if (getContentSource() === "seed") return seedResult();
  if (!isSupabaseConfigured()) throw new PublicContentUnavailableError();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(
      "kind,slug,title_i18n,summary_i18n,location_name,latitude,longitude,travel_styles,image_urls,payload,featured",
    )
    .eq("status", "published")
    .in("kind", [...MVP_DISCOVERABLE_KINDS])
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (error || !data || data.length === 0) throw new PublicContentUnavailableError();

  const parsed = (data as unknown[]).map(materializePublishedRow);
  if (parsed.some((item) => item === null)) throw new PublicContentUnavailableError();

  return {
    items: parsed.filter((item): item is MvpDiscoverable => item !== null),
    source: "supabase",
  };
});

export const getPublicDiscoverables = cache(async (): Promise<readonly MvpDiscoverable[]> => {
  const result = await getPublicContent();
  return result.items;
});

export const getDiscoverablesByKind = cache(
  async (kind: MvpDiscoverableKind): Promise<readonly MvpDiscoverable[]> => {
    const items = await getPublicDiscoverables();
    return items.filter((item) => item.kind === kind);
  },
);

export const getDiscoverable = cache(
  async (kind: MvpDiscoverableKind, slug: string): Promise<MvpDiscoverable | null> => {
    const items = await getPublicDiscoverables();
    return items.find((item) => item.kind === kind && item.slug === slug) ?? null;
  },
);

export const getRelatedDiscoverables = cache(
  async (item: MvpDiscoverable): Promise<readonly MvpDiscoverable[]> => {
    const items = await getPublicDiscoverables();
    const bySlug = new Map(items.map((entry) => [entry.slug, entry] as const));
    return item.relatedSlugs
      .map((slug) => bySlug.get(slug))
      .filter((entry): entry is MvpDiscoverable => Boolean(entry));
  },
);

export function getPublicTravelStyles(): readonly TravelStyle[] {
  return travelStyles;
}

export function getTravelStyle(slug: string): TravelStyle | null {
  return travelStyles.find((style) => style.slug === slug) ?? null;
}

export async function getDiscoverablesForStyle(
  style: TravelStyle,
): Promise<readonly MvpDiscoverable[]> {
  const items = await getPublicDiscoverables();
  const related = new Set(style.relatedSlugs);
  return items.filter(
    (item) => related.has(item.slug) || item.travelStyleSlugs.includes(style.slug),
  );
}

export function isMvpDiscoverableKind(value: string): value is MvpDiscoverableKind {
  return mvpKinds.has(value);
}
