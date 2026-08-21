import Image from "next/image";
import Link from "next/link";
import { SaveButton } from "@/components/save-button";
import { pickText, type Locale } from "@/lib/i18n";
import type { MvpDiscoverable } from "@/lib/types";

const kindLabels = {
  place: "Place",
  journey: "Journey",
  opportunity: "Opportunity",
  creator: "Creator",
} as const;

export function EntityCard({
  item,
  locale,
  priority = false,
}: {
  item: MvpDiscoverable;
  locale: Locale;
  priority?: boolean;
}) {
  const detailHref = `/${locale}/discover/${item.kind}/${item.slug}`;

  return (
    <article className={`entity-card kind-${item.kind}`} data-kind={item.kind}>
      <Link
        className="entity-card-media"
        href={detailHref}
        aria-label={pickText(item.title, locale)}
      >
        <Image
          src={item.media.src}
          alt={pickText(item.media.alt, locale)}
          fill
          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
          priority={priority}
        />
      </Link>
      <div className="entity-card-body">
        <div className="entity-card-meta">
          <span>{kindLabels[item.kind]}</span>
          <span>{pickText(item.location, locale)}</span>
        </div>
        <div>
          <h3>
            <Link href={detailHref}>{pickText(item.title, locale)}</Link>
          </h3>
          <p>{pickText(item.summary, locale)}</p>
        </div>
        <div className="entity-card-status">
          <span>{pickText(item.statusLabel, locale)}</span>
          <span>{pickText(item.source.label, locale)}</span>
        </div>
        <div className="entity-card-actions">
          <Link className="text-link" href={detailHref}>
            View details
          </Link>
          <SaveButton slug={item.slug} kind={item.kind} />
        </div>
      </div>
    </article>
  );
}

export function EntityGrid({
  items,
  locale,
  priorityCount = 0,
}: {
  items: readonly MvpDiscoverable[];
  locale: Locale;
  priorityCount?: number;
}) {
  return (
    <div className="entity-grid">
      {items.map((item, index) => (
        <EntityCard
          key={`${item.kind}:${item.slug}`}
          item={item}
          locale={locale}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
