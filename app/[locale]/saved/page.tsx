import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountNavigation } from "@/components/account-navigation";
import { AccountSavedLocal } from "@/components/account-saved-local";
import { loadSavedItems, localizedJson } from "@/lib/account";
import { getVerifiedAccount } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Saved",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await getVerifiedAccount();
  const remote = account.mode === "authenticated" ? await loadSavedItems(account) : null;

  return (
    <main className="page-main account-page section-shell">
      {account.mode === "authenticated" ? (
        <AccountNavigation
          current="saved"
          role={account.role}
          configured
          email={account.user.email}
        />
      ) : null}
      <header className="account-page__header">
        <p className="kicker">Your Veya world</p>
        <h1>Saved possibilities</h1>
        <p>Save as a guest, then sign in when you want the same list available from your account.</p>
      </header>

      {account.mode === "anonymous" ? (
        <div className="account-sign-in-prompt inline-notice">
          <p>Your browser saves are available below. Sign in to sync them to your account.</p>
          <Link className="button button-primary" href="/en/login?next=%2Fen%2Fsaved">
            Sign in and sync
          </Link>
        </div>
      ) : null}

      <AccountSavedLocal locale={locale} canSync={account.mode === "authenticated"} />

      {account.mode === "authenticated" ? (
        <section className="account-remote-saves" aria-labelledby="remote-saves-title">
          <div className="account-section-heading">
            <h2 id="remote-saves-title">Saved to your account</h2>
            <p>These records were confirmed in the connected Veya database.</p>
          </div>
          {remote?.error ? (
            <p className="account-empty-state">Account saves could not be loaded.</p>
          ) : remote?.data.length ? (
            <ul className="account-record-list">
              {remote.data.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{localizedJson(entry.content.title_i18n, locale)}</strong>
                    <span>{entry.content.location_name || entry.content.kind}</span>
                  </div>
                  <Link
                    className="text-link"
                    href={`/${locale}/discover/${entry.content.kind}/${entry.content.slug}`}
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="account-empty-state">No account saves yet.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
