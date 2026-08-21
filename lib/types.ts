export const SUPPORTED_LOCALES = ["en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type LocalizedText = Readonly<{
  en: string;
  /** Legacy source copy retained during the English-only reconstruction. */
  ru?: string;
}>;

export const DISCOVERABLE_KINDS = [
  "place",
  "journey",
  "opportunity",
  "creator",
  "project",
  "person",
] as const;

export type DiscoverableKind = (typeof DISCOVERABLE_KINDS)[number];

export const MVP_DISCOVERABLE_KINDS = [
  "place",
  "journey",
  "opportunity",
  "creator",
] as const;

export type MvpDiscoverableKind = (typeof MVP_DISCOVERABLE_KINDS)[number];

export const MAPPABLE_DISCOVERABLE_KINDS = [
  "place",
  "journey",
  "opportunity",
  "creator",
  "project",
] as const;

export type MappableDiscoverableKind =
  (typeof MAPPABLE_DISCOVERABLE_KINDS)[number];

export type AllowedAsset =
  | "/assets/veya-world.png"
  | "/assets/albania-coast-road.jpg"
  | "/assets/community-hero.jpg"
  | "/assets/community-table.png";

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface MediaAsset {
  readonly src: AllowedAsset;
  readonly alt: LocalizedText;
}

export type ContentSourceType =
  | "veya-editorial"
  | "veya-concept"
  | "partner-call"
  | "demo";

export interface SourceMetadata {
  readonly type: ContentSourceType;
  readonly label: LocalizedText;
  readonly note: LocalizedText;
  readonly url?: string;
}

export type ActionType =
  | "view-details"
  | "express-interest"
  | "request-information"
  | "partner-call";

export interface ActionMetadata {
  readonly type: ActionType;
  readonly label: LocalizedText;
  readonly href: string;
  readonly external: boolean;
}

export interface PublicLink {
  readonly provider:
    | "instagram"
    | "telegram"
    | "facebook"
    | "linkedin"
    | "website"
    | "other";
  readonly label: LocalizedText;
  readonly href: string;
  readonly external: true;
}

export type ContentStatus =
  | "published"
  | "concept"
  | "gathering-interest"
  | "seeking-partner"
  | "partner-call"
  | "demo";

export interface FilterTag {
  readonly slug: string;
  readonly label: LocalizedText;
  readonly group: "geography" | "theme" | "format" | "content-state";
}

export interface DiscoverableBase<K extends DiscoverableKind> {
  readonly kind: K;
  readonly slug: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly description: LocalizedText;
  readonly location: LocalizedText;
  readonly status: ContentStatus;
  readonly statusLabel: LocalizedText;
  readonly media: MediaAsset;
  readonly tagSlugs: readonly string[];
  readonly travelStyleSlugs: readonly string[];
  readonly relatedSlugs: readonly string[];
  readonly source: SourceMetadata;
  readonly actions: readonly ActionMetadata[];
  readonly featured?: boolean;
}

export interface MappableDiscoverableBase<
  K extends MappableDiscoverableKind,
> extends DiscoverableBase<K> {
  readonly coordinates: Coordinates;
  readonly coordinateLabel: LocalizedText;
}

export interface Place extends MappableDiscoverableBase<"place"> {
  readonly countryCode: string;
  readonly category: string;
  readonly categoryLabel: LocalizedText;
  readonly comfort: "simple" | "flexible" | "comfortable";
  readonly comfortLabel: LocalizedText;
}

export type JourneyConceptStatus =
  | "concept"
  | "gathering-interest"
  | "seeking-partner";

export interface Journey extends MappableDiscoverableBase<"journey"> {
  readonly status: JourneyConceptStatus;
  readonly duration: LocalizedText;
  readonly groupSize: LocalizedText;
  readonly accommodation: LocalizedText;
  readonly pace: LocalizedText;
  readonly availabilityNotice: LocalizedText;
  readonly routePlaceSlugs: readonly string[];
}

export type OpportunityCategory =
  | "experience"
  | "travel-group"
  | "community"
  | "retreat"
  | "long-stay"
  | "workshop";

export type OpportunityAvailability =
  | "concept"
  | "gathering-interest"
  | "partner-call";

export interface Opportunity
  extends MappableDiscoverableBase<"opportunity"> {
  readonly status: OpportunityAvailability;
  readonly category: OpportunityCategory;
  readonly categoryLabel: LocalizedText;
  readonly participationType: LocalizedText;
  readonly requirements: LocalizedText;
  readonly availability: {
    readonly state: OpportunityAvailability;
    readonly notice: LocalizedText;
  };
  readonly organiserSlug: string;
}

export type PublicProfileMode = "editorial" | "partner-call";

export interface Creator extends MappableDiscoverableBase<"creator"> {
  readonly profileMode: PublicProfileMode;
  readonly languages: readonly LocalizedText[];
  readonly specialties: readonly LocalizedText[];
  readonly profileNotice: LocalizedText;
}

export interface Project extends MappableDiscoverableBase<"project"> {
  readonly profileMode: PublicProfileMode;
  readonly purpose: LocalizedText;
  readonly participation: LocalizedText;
  readonly needs: readonly LocalizedText[];
  readonly profileNotice: LocalizedText;
}

export interface Person extends DiscoverableBase<"person"> {
  readonly status: "published" | "demo";
  readonly profileMode: "traveler" | "demo";
  readonly languages: readonly LocalizedText[];
  readonly introduction: LocalizedText;
  readonly preferredEnvironments: readonly LocalizedText[];
  readonly comfortLabel: LocalizedText;
  readonly travelRhythm: LocalizedText;
  readonly socialStyle: LocalizedText;
  readonly currentDirection: LocalizedText;
  readonly socialLinks: readonly PublicLink[];
  readonly coordinates?: never;
}

export type Discoverable =
  | Place
  | Journey
  | Opportunity
  | Creator
  | Project
  | Person;

export type MvpDiscoverable = Extract<
  Discoverable,
  { kind: MvpDiscoverableKind }
>;

export interface TravelStyle {
  readonly slug: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly description: LocalizedText;
  readonly practicalNote: LocalizedText;
  readonly media: MediaAsset;
  readonly tagSlugs: readonly string[];
  readonly relatedSlugs: readonly string[];
  readonly source: SourceMetadata;
  readonly action: ActionMetadata;
}

export interface MvpSeedContent {
  readonly filterTags: readonly FilterTag[];
  readonly travelStyles: readonly TravelStyle[];
  readonly discoverables: readonly Discoverable[];
}
