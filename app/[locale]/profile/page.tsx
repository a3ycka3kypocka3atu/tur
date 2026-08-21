import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { AccountModeNotice } from "@/components/account-mode-notice";
import { AccountNavigation } from "@/components/account-navigation";
import { ProfileForm } from "@/components/profile-form";
import { loadProfile } from "@/lib/account";
import { getProtectedAccount } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Travel profile",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  if (!isLocale(locale)) notFound();
  const account = await getProtectedAccount(locale, `/${locale}/profile`);
  const safeNext = next && next.startsWith(`/${locale}/`) && !next.startsWith("//") ? next : null;

  if (account.mode === "local") {
    return (
      <main className="page-main account-page section-shell">
        <header className="account-page__header">
          <p className="kicker">Traveler account</p>
          <h1>Your travel profile</h1>
        </header>
        <AccountModeNotice kind="local" />
      </main>
    );
  }

  const profile = await loadProfile(account);
  const fallbackName = account.user.email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Veya traveler";

  return (
    <main className="page-main account-page section-shell">
      <AccountNavigation
        current="profile"
        role={account.role}
        configured
        email={account.user.email}
      />
      <header className="account-page__header">
        <p className="kicker">Traveler account</p>
        <h1>Your travel profile</h1>
        <p>Keep this lightweight. Add only the travel context that helps Veya understand your request.</p>
      </header>
      {profile.error ? (
        <AccountModeNotice kind="load-error" />
      ) : (
        <ProfileForm profile={profile.data} fallbackName={fallbackName} />
      )}
      <div className="account-page__footer-actions">
        {safeNext ? (
          <Link className="button button-primary" href={safeNext}>
            Continue to your previous page
          </Link>
        ) : null}
        <form action={signOutAction}>
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
