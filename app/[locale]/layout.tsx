import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isLocale, locales } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div
      className="site-shell"
      data-veya-app-shell
      data-locale={locale}
      lang={locale}
      dir="ltr"
    >
      <SiteHeader locale={locale} />
      <div id="page-content" className="site-content" tabIndex={-1}>
        {children}
      </div>
      <SiteFooter locale={locale} />
    </div>
  );
}
