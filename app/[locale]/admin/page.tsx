import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateInterestStatusAction } from "@/app/actions";
import { AccountModeNotice } from "@/components/account-mode-notice";
import { AccountNavigation } from "@/components/account-navigation";
import {
  formatAccountDate,
  loadOperatorInterests,
  localizedJson,
} from "@/lib/account";
import { getProtectedAccount } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Operator inbox",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const account = await getProtectedAccount(locale, `/${locale}/admin`);

  if (account.mode === "local") {
    return (
      <main className="page-main account-page section-shell">
        <header className="account-page__header"><h1>Operator inbox</h1></header>
        <AccountModeNotice kind="local" />
      </main>
    );
  }

  const allowed = account.roleSynchronized && (account.role === "operator" || account.role === "admin");
  if (!allowed) {
    return (
      <main className="page-main account-page section-shell">
        <AccountNavigation
          current="admin"
          role={account.role}
          configured
          email={account.user.email}
        />
        <header className="account-page__header"><h1>Operator inbox</h1></header>
        <AccountModeNotice kind={account.roleSynchronized ? "operator-required" : "role-mismatch"} />
      </main>
    );
  }

  const result = await loadOperatorInterests(account);
  return (
    <main className="page-main account-page section-shell">
      <AccountNavigation
        current="admin"
        role={account.role}
        configured
        email={account.user.email}
      />
      <header className="account-page__header">
        <p className="kicker">Veya operations</p>
        <h1>Interest inbox</h1>
        <p>Review confirmed traveler requests and record the coordination status.</p>
      </header>
      {result.error ? (
        <AccountModeNotice kind="load-error" />
      ) : result.data.length ? (
        <div className="operator-inbox">
          {result.data.map((entry) => (
            <article key={entry.id} className="operator-request">
              <header>
                <div>
                  <p className="operator-request__status">{entry.status}</p>
                  <h2>{localizedJson(entry.content.title_i18n, locale)}</h2>
                </div>
                <span>{formatAccountDate(entry.created_at, locale)}</span>
              </header>
              <dl>
                <div><dt>Traveler</dt><dd>{entry.contact_name || "Unnamed traveler"}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${entry.contact_email}`}>{entry.contact_email}</a></dd></div>
              </dl>
              <p className="operator-request__message">{entry.message}</p>
              <form className="operator-request__form" action={updateInterestStatusAction}>
                <input type="hidden" name="id" value={entry.id} />
                <label>
                  Status
                  <select name="status" defaultValue={entry.status}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label>
                  Internal notes
                  <textarea name="admin_notes" defaultValue={entry.admin_notes ?? ""} maxLength={4000} />
                </label>
                <div>
                  <button className="button button-primary" type="submit">Update request</button>
                  <Link
                    className="text-link"
                    href={`/${locale}/discover/${entry.content.kind}/${entry.content.slug}`}
                  >
                    Open detail
                  </Link>
                </div>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <p className="account-empty-state">No interest requests have been received.</p>
      )}
    </main>
  );
}
