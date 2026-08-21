import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { isLocale } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  if (!isLocale(locale)) notFound();

  const safeNext = next && next.startsWith(`/${locale}/`) && !next.startsWith("//") ? next : `/${locale}/profile`;

  return (
    <main id="main" className="auth-page page-shell">
      <AuthPanel
        nextPath={safeNext}
        configured={isSupabaseConfigured()}
        initialError={error === "auth"}
      />
    </main>
  );
}
