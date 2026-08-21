import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildLocalizedMetadata } from "@/components/collection-page";
import { EntityGrid } from "@/components/entity-card";
import { TravelStyleCard } from "@/components/travel-style-card";
import { VeyaMap } from "@/components/veya-map";
import {
  getPublicDiscoverables,
  getPublicTravelStyles,
} from "@/lib/content/repository";
import type { Locale } from "@/lib/i18n";

const copy = {
  title: "A map of ways to experience the world",
  description:
    "Discover meaningful places, journey ideas, creators and ways to participate through one connected travel world.",
  kicker: "Travel discovery, made human",
  notice:
    "This first release combines editorial place guides with clearly labeled Veya concepts and partner calls. It does not imply confirmed dates, bookings or external partners.",
};

function SectionHeading({
  title,
  text,
  action,
  href,
}: {
  title: string;
  text: string;
  action: string;
  href: string;
}) {
  return (
    <header className="section-heading">
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="text-link" href={href}>
        {action}
      </Link>
    </header>
  );
}

export function getHomeMetadata(locale: Locale): Metadata {
  return buildLocalizedMetadata({
    locale,
    title: copy.title,
    description: copy.description,
    path: "",
    image: "/assets/veya-world.png",
    imageAlt: "Illustrated Veya world with routes, places and people",
  });
}

export async function HomePage({ locale }: { locale: Locale }) {
  const [items, styles] = await Promise.all([
    getPublicDiscoverables(),
    Promise.resolve(getPublicTravelStyles()),
  ]);
  const featured = items.filter((item) => item.featured).slice(0, 6);
  const startingPoints = featured.length >= 3 ? featured : items.slice(0, 6);
  const participation = items
    .filter((item) => item.kind === "opportunity" || item.kind === "creator")
    .slice(0, 5);

  return (
    <main className="page-main">
      <section className="page-shell page-hero home-hero" aria-labelledby="home-title">
        <div>
          <p className="kicker">{copy.kicker}</p>
          <h1 id="home-title">{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/${locale}/explore`}>
              Explore the world
            </Link>
            <Link className="button button-secondary" href={`/${locale}/map`}>
              Open the map
            </Link>
          </div>
        </div>
        <Image
          src="/assets/veya-world.png"
          alt="Illustrated Veya world with roads, people and places"
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 820px) 100vw, 1280px"
          className="home-hero__image"
        />
        <p className="inline-notice" role="note">
          {copy.notice}
        </p>
      </section>

      <section className="section-shell home-section" aria-labelledby="featured-title">
        <SectionHeading
          title="Choose what draws you in"
          text="Move between a place, a journey concept, a collaboration idea or a local creator call."
          action="View everything"
          href={`/${locale}/explore`}
        />
        <div id="featured-title">
          <EntityGrid items={startingPoints} locale={locale} priorityCount={2} />
        </div>
      </section>

      <section className="section-shell home-section" aria-labelledby="travel-style-title">
        <div id="travel-style-title">
          <SectionHeading
            title="Start with how you want to travel"
            text="Use a style to filter the map, cards and list before choosing a destination."
            action="Filter Explore by style"
            href={`/${locale}/explore`}
          />
        </div>
        <div className="travel-style-row">
          {styles.slice(0, 6).map((style) => (
            <TravelStyleCard key={style.slug} style={style} locale={locale} />
          ))}
        </div>
      </section>

      <section className="section-shell home-section" aria-labelledby="home-map-title">
        <div id="home-map-title">
          <SectionHeading
            title="Explore the first Veya region"
            text="The initial map focuses on Albania and nearby Balkan routes with honest editorial and concept labels."
            action="Use the full map"
            href={`/${locale}/map`}
          />
        </div>
        <VeyaMap items={items.slice(0, 12)} locale={locale} />
      </section>

      <section className="section-shell home-section" aria-labelledby="participation-title">
        <div id="participation-title">
          <SectionHeading
            title="See where participation could begin"
            text="Open a concept or creator call, understand its status, then sign in to express interest."
            action="Explore opportunities"
            href={`/${locale}/opportunities`}
          />
        </div>
        <EntityGrid items={participation} locale={locale} />
      </section>
    </main>
  );
}
