import type { Metadata } from "next";
import Link from "next/link";
import { DiscoveryExplorer, type DiscoveryView } from "@/components/discovery-explorer";
import { EntityGrid } from "@/components/entity-card";
import {
  getDiscoverablesByKind,
  getPublicDiscoverables,
} from "@/lib/content/repository";
import type { Locale } from "@/lib/i18n";
import {
  MVP_DISCOVERABLE_KINDS,
  type MvpDiscoverable,
  type MvpDiscoverableKind,
} from "@/lib/types";

export type CollectionKey =
  | "explore"
  | "map"
  | "places"
  | "journeys"
  | "opportunities"
  | "creators";

export type RouteSearchParams = Record<string, string | string[] | undefined>;

type CollectionDefinition = {
  readonly path: string;
  readonly kind?: MvpDiscoverableKind;
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
};

const collections: Record<CollectionKey, CollectionDefinition> = {
  explore: {
    path: "/explore",
    kicker: "Discovery",
    title: "Find a way into the world",
    description:
      "Search Veya's editorial places, journey concepts, participation ideas and creator calls in one connected view.",
  },
  map: {
    path: "/map",
    kicker: "World map",
    title: "See how possibilities connect to place",
    description:
      "Browse places, journey concepts, opportunities and creators. A marker describes curated content, not confirmed availability.",
  },
  places: {
    path: "/places",
    kind: "place",
    kicker: "Places",
    title: "Places worth understanding slowly",
    description:
      "Editorial starting points across Albania and the Balkans, with location context and practical orientation.",
  },
  journeys: {
    path: "/journeys",
    kind: "journey",
    kicker: "Journey concepts",
    title: "Routes taking shape",
    description:
      "Explore Veya journey concepts and register interest without mistaking an early idea for a bookable departure.",
  },
  opportunities: {
    path: "/opportunities",
    kind: "opportunity",
    kicker: "Opportunities",
    title: "Ideas for joining, hosting and creating",
    description:
      "Veya concepts and partner calls with an explicit status, participation format and next step.",
  },
  creators: {
    path: "/creators",
    kind: "creator",
    kicker: "Creators",
    title: "Editorial voices and open creator calls",
    description:
      "Meet Veya's editorial presence and see where local knowledge or creative collaboration is being sought.",
  },
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function collectionImage(collection: CollectionKey): string {
  if (collection === "creators") return "/assets/community-table.png";
  if (["places", "journeys", "map"].includes(collection)) {
    return "/assets/albania-coast-road.jpg";
  }
  return "/assets/veya-world.png";
}

export function buildLocalizedMetadata({
  locale,
  title,
  description,
  path,
  image = "/assets/veya-world.png",
  imageAlt,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
}): Metadata {
  const canonical = `/${locale}${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      title,
      description,
      images: [{ url: image, alt: imageAlt ?? title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function getCollectionMetadata(locale: Locale, collection: CollectionKey): Metadata {
  const definition = collections[collection];
  return buildLocalizedMetadata({
    locale,
    title: definition.title,
    description: definition.description,
    path: definition.path,
    image: collectionImage(collection),
  });
}

function parseKind(value: string | undefined): MvpDiscoverableKind | "all" {
  return value && MVP_DISCOVERABLE_KINDS.includes(value as MvpDiscoverableKind)
    ? (value as MvpDiscoverableKind)
    : "all";
}

function parseView(value: string | undefined, fallback: DiscoveryView): DiscoveryView {
  return value === "cards" || value === "list" || value === "map" ? value : fallback;
}

export async function CollectionPage({
  locale,
  collection,
  searchParams = {},
}: {
  locale: Locale;
  collection: CollectionKey;
  searchParams?: RouteSearchParams;
}) {
  const definition = collections[collection];
  const isExplorer = collection === "explore" || collection === "map";
  const items: readonly MvpDiscoverable[] = isExplorer
    ? await getPublicDiscoverables()
    : await getDiscoverablesByKind(definition.kind as MvpDiscoverableKind);

  const query = firstParam(searchParams.q)?.slice(0, 120) ?? "";
  const style = firstParam(searchParams.style)?.slice(0, 80) ?? "all";
  const initialKind = parseKind(firstParam(searchParams.kind));
  const initialView = parseView(
    firstParam(searchParams.view),
    collection === "map" ? "map" : "cards",
  );

  return (
    <main className="page-main">
      <header className="page-shell page-hero">
        <div>
          <p className="kicker">{definition.kicker}</p>
          <h1>{definition.title}</h1>
        </div>
        <p>{definition.description}</p>
      </header>

      <section className="section-shell" aria-label="Discovery results">
        {items.length === 0 ? (
          <div className="empty-state" role="status">
            <h2>Nothing is published here yet</h2>
            <p>Open the full discovery view to continue through the available content.</p>
            <Link className="button button-secondary" href={`/${locale}/explore`}>
              Open Explore
            </Link>
          </div>
        ) : isExplorer ? (
          <DiscoveryExplorer
            items={items}
            locale={locale}
            initialKind={initialKind}
            initialView={initialView}
            initialQuery={query}
            initialStyle={style}
          />
        ) : (
          <div style={{ paddingBottom: "clamp(72px, 9vw, 120px)" }}>
            <EntityGrid items={items} locale={locale} priorityCount={2} />
          </div>
        )}
      </section>
    </main>
  );
}
