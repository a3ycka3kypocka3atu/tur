import "server-only";

import type { AuthenticatedAccount } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import type { SavedReference } from "@/lib/saved";

export const CONTENT_KINDS = ["place", "journey", "opportunity", "creator"] as const;
export type DatabaseContentKind = (typeof CONTENT_KINDS)[number];
export type DatabaseContentStatus = "draft" | "published" | "archived";

export type ProfileRecord = {
  id: string;
  public_name: string;
  country: string | null;
  region: string | null;
  languages: string[];
  introduction: string | null;
  travel_interests: string[];
  preferred_environments: string[];
  travel_styles: string[];
  travel_goals: string | null;
  social_links: Record<string, string>;
};

export type ContentRecord = {
  id: string;
  owner_id: string | null;
  kind: DatabaseContentKind;
  status: DatabaseContentStatus;
  slug: string;
  title_i18n: Record<string, unknown>;
  summary_i18n: Record<string, unknown>;
  location_name: string | null;
  categories: string[];
  travel_styles: string[];
  external_url: string | null;
  payload: Record<string, unknown>;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedItemRecord = {
  id: string;
  content_item_id: string;
  created_at: string;
  content: Pick<
    ContentRecord,
    "id" | "kind" | "status" | "slug" | "title_i18n" | "summary_i18n" | "location_name"
  >;
};

export type InterestRecord = {
  id: string;
  content_item_id: string;
  status: "new" | "contacted" | "closed" | "withdrawn";
  message: string;
  created_at: string;
  updated_at: string;
  content: Pick<ContentRecord, "id" | "kind" | "slug" | "title_i18n" | "location_name">;
};

export type OperatorInterestRecord = InterestRecord & {
  user_id: string;
  contact_name: string | null;
  contact_email: string;
  admin_notes: string | null;
};

export type AccountQuery<T> =
  | { data: T; error: null }
  | { data: null; error: "load_failed" };

type UnknownRow = Record<string, unknown>;

const contentSelect = [
  "id",
  "owner_id",
  "kind",
  "status",
  "slug",
  "title_i18n",
  "summary_i18n",
  "location_name",
  "categories",
  "travel_styles",
  "external_url",
  "payload",
  "featured",
  "published_at",
  "created_at",
  "updated_at",
].join(",");

export async function loadProfile(account: AuthenticatedAccount): Promise<AccountQuery<ProfileRecord | null>> {
  const { data, error } = await account.client
    .from("profiles")
    .select(
      "id,public_name,country,region,languages,introduction,travel_interests,preferred_environments,travel_styles,travel_goals,social_links",
    )
    .eq("id", account.user.id)
    .maybeSingle();

  if (error) return { data: null, error: "load_failed" };
  return { data: data ? normalizeProfile(data as UnknownRow) : null, error: null };
}

export async function loadSavedItems(account: AuthenticatedAccount): Promise<AccountQuery<SavedItemRecord[]>> {
  const { data, error } = await account.client
    .from("saved_items")
    .select(
      "id,content_item_id,created_at,content_items(id,kind,status,slug,title_i18n,summary_i18n,location_name)",
    )
    .eq("user_id", account.user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: "load_failed" };

  const saved = ((data ?? []) as unknown as UnknownRow[]).flatMap((row) => {
    const content = relatedRow(row.content_items);
    if (!content || !isDatabaseKind(content.kind) || typeof content.slug !== "string") return [];

    return [{
      id: stringValue(row.id),
      content_item_id: stringValue(row.content_item_id),
      created_at: stringValue(row.created_at),
      content: {
        id: stringValue(content.id),
        kind: content.kind,
        status: contentStatus(content.status),
        slug: content.slug,
        title_i18n: recordValue(content.title_i18n),
        summary_i18n: recordValue(content.summary_i18n),
        location_name: nullableString(content.location_name),
      },
    } satisfies SavedItemRecord];
  });

  return { data: saved, error: null };
}

export async function loadInterests(account: AuthenticatedAccount): Promise<AccountQuery<InterestRecord[]>> {
  const { data, error } = await account.client
    .from("interest_requests")
    .select("id,content_item_id,status,message,created_at,updated_at,content_items(id,kind,slug,title_i18n,location_name)")
    .eq("user_id", account.user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: "load_failed" };

  const interests = ((data ?? []) as unknown as UnknownRow[]).flatMap((row) => {
    const content = relatedRow(row.content_items);
    const status = interestStatus(row.status);
    if (!content || !status || !isDatabaseKind(content.kind) || typeof content.slug !== "string") return [];

    return [{
      id: stringValue(row.id),
      content_item_id: stringValue(row.content_item_id),
      status,
      message: stringValue(row.message),
      created_at: stringValue(row.created_at),
      updated_at: stringValue(row.updated_at),
      content: {
        id: stringValue(content.id),
        kind: content.kind,
        slug: content.slug,
        title_i18n: recordValue(content.title_i18n),
        location_name: nullableString(content.location_name),
      },
    } satisfies InterestRecord];
  });

  return { data: interests, error: null };
}

export async function loadOperatorInterests(
  account: AuthenticatedAccount,
): Promise<AccountQuery<OperatorInterestRecord[]>> {
  const { data, error } = await account.client
    .from("interest_requests")
    .select(
      "id,user_id,content_item_id,status,contact_name,contact_email,message,admin_notes,created_at,updated_at,content_items(id,kind,slug,title_i18n,location_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { data: null, error: "load_failed" };

  const interests = ((data ?? []) as unknown as UnknownRow[]).flatMap((row) => {
    const content = relatedRow(row.content_items);
    const status = interestStatus(row.status);
    if (
      !content ||
      !status ||
      !isDatabaseKind(content.kind) ||
      typeof content.slug !== "string" ||
      typeof row.contact_email !== "string"
    ) {
      return [];
    }

    return [{
      id: stringValue(row.id),
      user_id: stringValue(row.user_id),
      content_item_id: stringValue(row.content_item_id),
      status,
      contact_name: nullableString(row.contact_name),
      contact_email: row.contact_email,
      message: stringValue(row.message),
      admin_notes: nullableString(row.admin_notes),
      created_at: stringValue(row.created_at),
      updated_at: stringValue(row.updated_at),
      content: {
        id: stringValue(content.id),
        kind: content.kind,
        slug: content.slug,
        title_i18n: recordValue(content.title_i18n),
        location_name: nullableString(content.location_name),
      },
    } satisfies OperatorInterestRecord];
  });

  return { data: interests, error: null };
}

export async function loadOwnedContent(account: AuthenticatedAccount): Promise<AccountQuery<ContentRecord[]>> {
  const { data, error } = await account.client
    .from("content_items")
    .select(contentSelect)
    .eq("owner_id", account.user.id)
    .order("updated_at", { ascending: false });

  if (error) return { data: null, error: "load_failed" };
  return { data: ((data ?? []) as unknown as UnknownRow[]).flatMap(normalizeContent), error: null };
}

export async function loadModerationContent(account: AuthenticatedAccount): Promise<AccountQuery<ContentRecord[]>> {
  const { data, error } = await account.client
    .from("content_items")
    .select(contentSelect)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return { data: null, error: "load_failed" };
  return { data: ((data ?? []) as unknown as UnknownRow[]).flatMap(normalizeContent), error: null };
}

export async function loadContentItem(
  account: AuthenticatedAccount,
  id: string,
  ownerOnly = false,
): Promise<AccountQuery<ContentRecord | null>> {
  let query = account.client.from("content_items").select(contentSelect).eq("id", id);
  if (ownerOnly) query = query.eq("owner_id", account.user.id);
  const { data, error } = await query.maybeSingle();

  if (error) return { data: null, error: "load_failed" };
  const normalized = data ? normalizeContent(data as unknown as UnknownRow) : [];
  return { data: normalized[0] ?? null, error: null };
}

export function localizedJson(value: Record<string, unknown>, locale: Locale, fallback = "Untitled"): string {
  const localized = value[locale];
  if (typeof localized === "string" && localized.trim()) return localized.trim();
  const english = value.en;
  return typeof english === "string" && english.trim() ? english.trim() : fallback;
}

export function descriptionJson(payload: Record<string, unknown>, locale: Locale): string {
  const descriptions = recordValue(payload.description_i18n);
  return localizedJson(descriptions, locale, "");
}

export function formatAccountDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export type ContentFormValues = {
  kind: DatabaseContentKind;
  slug: string;
  title_i18n: { en: string };
  summary_i18n: { en: string };
  description_i18n: { en: string };
  location_name: string | null;
  categories: string[];
  travel_styles: string[];
  external_url: string | null;
};

export function parseContentForm(formData: FormData): ContentFormValues | null {
  const kind = formString(formData, "kind", 40);
  const slug = formString(formData, "slug", 160).toLowerCase();
  const titleEn = formString(formData, "title_en", 160);
  const externalUrl = formString(formData, "external_url", 2000);

  if (!isDatabaseKind(kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !titleEn) {
    return null;
  }
  if (externalUrl && !isHttpUrl(externalUrl)) return null;

  return {
    kind,
    slug,
    title_i18n: { en: titleEn },
    summary_i18n: {
      en: formString(formData, "summary_en", 1200),
    },
    description_i18n: {
      en: formString(formData, "description_en", 5000),
    },
    location_name: nullableFormString(formData, "location_name", 240),
    categories: listFromForm(formData, "categories", 40),
    travel_styles: listFromForm(formData, "travel_styles", 40),
    external_url: externalUrl || null,
  };
}

export function mergeContentPayload(
  current: Record<string, unknown>,
  values: ContentFormValues,
): Record<string, unknown> {
  return { ...current, description_i18n: values.description_i18n };
}

export function formString(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function nullableFormString(formData: FormData, key: string, maximum: number): string | null {
  return formString(formData, key, maximum) || null;
}

export function listFromForm(formData: FormData, key: string, maximum: number): string[] {
  return [...new Set(formString(formData, key, 4000).split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]
    .slice(0, maximum);
}

export function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validSavedReferences(value: unknown): SavedReference[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const slug = "slug" in entry && typeof entry.slug === "string" ? entry.slug.trim() : "";
    const kind = "kind" in entry && typeof entry.kind === "string" ? entry.kind : "";
    if (!slug || slug.length > 160 || !isDatabaseKind(kind)) return [];
    return [{ slug, kind } satisfies SavedReference];
  });
}

function normalizeProfile(row: UnknownRow): ProfileRecord {
  return {
    id: stringValue(row.id),
    public_name: stringValue(row.public_name),
    country: nullableString(row.country),
    region: nullableString(row.region),
    languages: stringArray(row.languages),
    introduction: nullableString(row.introduction),
    travel_interests: stringArray(row.travel_interests),
    preferred_environments: stringArray(row.preferred_environments),
    travel_styles: stringArray(row.travel_styles),
    travel_goals: nullableString(row.travel_goals),
    social_links: stringRecord(row.social_links),
  };
}

function normalizeContent(row: UnknownRow): ContentRecord[] {
  if (!isDatabaseKind(row.kind) || !isContentStatus(row.status) || typeof row.slug !== "string") return [];
  return [{
    id: stringValue(row.id),
    owner_id: nullableString(row.owner_id),
    kind: row.kind,
    status: row.status,
    slug: row.slug,
    title_i18n: recordValue(row.title_i18n),
    summary_i18n: recordValue(row.summary_i18n),
    location_name: nullableString(row.location_name),
    categories: stringArray(row.categories),
    travel_styles: stringArray(row.travel_styles),
    external_url: nullableString(row.external_url),
    payload: recordValue(row.payload),
    featured: row.featured === true,
    published_at: nullableString(row.published_at),
    created_at: stringValue(row.created_at),
    updated_at: stringValue(row.updated_at),
  }];
}

function relatedRow(value: unknown): UnknownRow | null {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is UnknownRow {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function recordValue(value: unknown): UnknownRow {
  return isRecord(value) ? value : {};
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isDatabaseKind(value: unknown): value is DatabaseContentKind {
  return CONTENT_KINDS.includes(value as DatabaseContentKind);
}

function isContentStatus(value: unknown): value is DatabaseContentStatus {
  return ["draft", "in_review", "published", "rejected", "archived"].includes(String(value));
}

function contentStatus(value: unknown): DatabaseContentStatus {
  return isContentStatus(value) ? value : "draft";
}

function interestStatus(value: unknown): InterestRecord["status"] | null {
  return ["new", "contacted", "closed", "withdrawn"].includes(String(value))
    ? value as InterestRecord["status"]
    : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
