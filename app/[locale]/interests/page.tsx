import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountModeNotice } from "@/components/account-mode-notice";
import { AccountNavigation } from "@/components/account-navigation";
import { formatAccountDate, loadInterests, localizedJson } from "@/lib/account";
import { getProtectedAccount } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Interest history",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await getProtectedAccount(locale, `/${locale}/interests`);

  if (account.mode === "local") {
    return (
      <main className="page-main account-page section-shell">
        <header className="account-page__header">
          <p className="kicker">Traveler account</p>
          <h1>Interest history</h1>
        </header>
        <AccountModeNotice kind="local" />
      </main>
    );
  }

  const result = await loadInterests(account);
  return (
    <main className="page-main account-page section-shell">
      <AccountNavigation
        current="interests"
        role={account.role}
        configured
        email={account.user.email}
      />
      <header className="account-page__header">
        <p className="kicker">Traveler account</p>
        <h1>Interest history</h1>
        <p>Every entry here was confirmed in Veya's platform storage.</p>
      </header>
      {result.error ? (
        <AccountModeNotice kind="load-error" />
      ) : result.data.length ? (
        <ul className="interest-history account-record-list">
          {result.data.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{localizedJson(entry.content.title_i18n, locale)}</strong>
                <span>{formatAccountDate(entry.created_at, locale)} | {entry.status}</span>
                <p>{entry.message}</p>
              </div>
              <Link
                className="text-link"
                href={`/${locale}/discover/${entry.content.kind}/${entry.content.slug}`}
              >
                View detail
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="account-empty-state">
          <p>You have not expressed interest yet.</p>
          <Link className="button button-primary" href={`/${locale}/explore`}>
            Explore possibilities
          </Link>
        </div>
      )}
    </main>
  );
}
