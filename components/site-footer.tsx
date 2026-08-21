import Link from "next/link";
import { getCopy, localePath, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__identity">
          <Link className="site-footer__brand" href={localePath(locale)} aria-label={copy.brandAria}>
            <span className="site-footer__brand-mark" aria-hidden="true">
              V
            </span>
            <span>Veya</span>
          </Link>
          <p className="site-footer__tagline">{copy.footerLine}</p>
        </div>

        <nav className="site-footer__navigation" aria-label={copy.navAria}>
          <div className="site-footer__link-group">
            <Link href={localePath(locale, "/explore")}>{copy.footerExplore}</Link>
            <Link href={localePath(locale, "/journeys")}>{copy.journeys}</Link>
            <Link href={localePath(locale, "/opportunities")}>{copy.opportunities}</Link>
            <Link href={localePath(locale, "/map")}>{copy.map}</Link>
          </div>
          <div className="site-footer__link-group">
            <Link href={localePath(locale, "/profile")}>{copy.footerCreate}</Link>
            <Link href={localePath(locale, "/creators")}>{copy.creators}</Link>
          </div>
          <div className="site-footer__link-group site-footer__link-group--utility">
            <Link href={localePath(locale, "/saved")}>{copy.saved}</Link>
            <Link href={localePath(locale, "/login")}>{copy.signIn}</Link>
          </div>
        </nav>
      </div>

      <div className="site-footer__meta">
        <span>© {new Date().getFullYear()} Veya</span>
        <span>{copy.footerLine}</span>
      </div>
    </footer>
  );
}
