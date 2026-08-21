import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildLocalizedMetadata } from "@/components/collection-page";
import { EntityGrid } from "@/components/entity-card";
import { InterestForm } from "@/components/interest-form";
import { SaveButton } from "@/components/save-button";
import { VeyaMap } from "@/components/veya-map";
import { loadProfile } from "@/lib/account";
import { getVerifiedAccount } from "@/lib/auth";
import { getRelatedDiscoverables } from "@/lib/content/repository";
import { pickText, type Locale } from "@/lib/i18n";
import type { LocalizedText, MvpDiscoverable } from "@/lib/types";

function factRows(item: MvpDiscoverable): Array<[string, string]> {
  switch (item.kind) {
    case "place":
      return [
        ["Place type", pickText(item.categoryLabel, "en")],
        ["Comfort", pickText(item.comfortLabel, "en")],
      ];
    case "journey":
      return [
        ["Duration", pickText(item.duration, "en")],
        ["Group", pickText(item.groupSize, "en")],
        ["Accommodation", pickText(item.accommodation, "en")],
        ["Pace", pickText(item.pace, "en")],
      ];
    case "opportunity":
      return [
        ["Format", pickText(item.categoryLabel, "en")],
        ["Participation", pickText(item.participationType, "en")],
        ["Requirements", pickText(item.requirements, "en")],
      ];
    case "creator":
      return [
        ["Languages", item.languages.map((value) => pickText(value, "en")).join(", ")],
        ["Specialties", item.specialties.map((value) => pickText(value, "en")).join(", ")],
      ];
  }
}

function availabilityText(item: MvpDiscoverable): LocalizedText | null {
  if (item.kind === "journey") return item.availabilityNotice;
  if (item.kind === "opportunity") return item.availability.notice;
  if (item.kind === "creator") return item.profileNotice;
  return null;
}

export function getDetailMetadata(locale: Locale, item: MvpDiscoverable): Metadata {
  return buildLocalizedMetadata({
    locale,
    title: pickText(item.title, locale),
    description: pickText(item.summary, locale),
    path: `/discover/${item.kind}/${item.slug}`,
    image: item.media.src,
    imageAlt: pickText(item.media.alt, locale),
  });
}

export async function DetailPage({
  locale,
  item,
}: {
  locale: Locale;
  item: MvpDiscoverable;
}) {
  const [related, account] = await Promise.all([
    getRelatedDiscoverables(item),
    getVerifiedAccount(),
  ]);
  const profileResult =
    account.mode === "authenticated" ? await loadProfile(account) : null;
  const availability = availabilityText(item);
  const detailPath = `/${locale}/discover/${item.kind}/${item.slug}`;

  return (
    <main className="page-main detail-page">
      <article className="page-shell detail-hero">
        <div className="detail-hero__copy">
          <p className="kicker">{item.kind}</p>
          <h1>{pickText(item.title, locale)}</h1>
          <p className="detail-hero__summary">{pickText(item.summary, locale)}</p>
          <div className="detail-hero__meta">
            <span>{pickText(item.location, locale)}</span>
            <span>{pickText(item.statusLabel, locale)}</span>
          </div>
          <div className="detail-hero__actions">
            <SaveButton slug={item.slug} kind={item.kind} />
            <a className="button button-primary" href="#express-interest">
              Express interest
            </a>
          </div>
        </div>
        <div className="detail-hero__media">
          <Image
            src={item.media.src}
            alt={pickText(item.media.alt, locale)}
            fill
            priority
            sizes="(max-width: 820px) 100vw, 52vw"
          />
        </div>
      </article>

      <section className="section-shell detail-content" aria-labelledby="detail-overview-title">
        <div className="detail-story">
          <h2 id="detail-overview-title">What to know</h2>
          <p>{pickText(item.description, locale)}</p>
          {availability ? (
            <div className="inline-notice" role="note">
              {pickText(availability, locale)}
            </div>
          ) : null}
          <div className="detail-source">
            <strong>{pickText(item.source.label, locale)}</strong>
            <p>{pickText(item.source.note, locale)}</p>
          </div>
        </div>

        <dl className="detail-facts">
          {factRows(item).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Travel styles</dt>
            <dd>{item.travelStyleSlugs.map((style) => style.replaceAll("-", " ")).join(", ")}</dd>
          </div>
        </dl>
      </section>

      <section className="section-shell detail-map" aria-labelledby="detail-map-title">
        <h2 id="detail-map-title">Place on the map</h2>
        <VeyaMap items={[item]} locale={locale} />
      </section>

      <section id="express-interest" className="section-shell interest-section" aria-labelledby="interest-title">
        <div>
          <h2 id="interest-title">Express interest</h2>
          <p>
            Tell Veya what you would like to explore. This is a human coordination request,
            not a booking or payment.
          </p>
        </div>
        {account.mode === "local" ? (
          <div className="inline-notice">
            Account storage is not connected in this environment, so this form cannot submit yet.
          </div>
        ) : account.mode === "anonymous" ? (
          <div className="interest-gate">
            <p>Sign in, create a lightweight travel profile, then send your request.</p>
            <Link
              className="button button-primary"
              href={`/${locale}/login?next=${encodeURIComponent(detailPath)}`}
            >
              Sign in to continue
            </Link>
          </div>
        ) : profileResult?.error ? (
          <div className="inline-notice">Your account data could not be loaded. Try again later.</div>
        ) : !profileResult?.data ? (
          <div className="interest-gate">
            <p>Create your travel profile before sending an interest request.</p>
            <Link className="button button-primary" href={`/${locale}/profile?next=${encodeURIComponent(detailPath)}`}>
              Create travel profile
            </Link>
          </div>
        ) : (
          <InterestForm
            kind={item.kind}
            slug={item.slug}
            title={pickText(item.title, locale)}
          />
        )}
      </section>

      {related.length > 0 ? (
        <section className="section-shell related-section" aria-labelledby="related-title">
          <h2 id="related-title">Continue exploring</h2>
          <EntityGrid items={related.slice(0, 4)} locale={locale} />
        </section>
      ) : null}
    </main>
  );
}
