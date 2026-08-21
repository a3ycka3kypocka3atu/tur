"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MobileNav } from "@/components/mobile-nav";
import { getCopy, localePath, type Locale } from "@/lib/i18n";

const primaryNavigation = [
  { path: "/explore", label: "explore" },
  { path: "/map", label: "map" },
  { path: "/journeys", label: "journeys" },
  { path: "/opportunities", label: "opportunities" },
  { path: "/creators", label: "creators" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#page-content">
        {copy.skip}
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="site-header__brand" href={localePath(locale)} aria-label={copy.brandAria}>
            <span className="site-header__brand-mark" aria-hidden="true">
              V
            </span>
            <span className="site-header__brand-name">Veya</span>
          </Link>

          <nav className="site-header__navigation" aria-label={copy.navAria}>
            <div className="site-header__primary-nav">
              {primaryNavigation.map((item) => {
                const href = localePath(locale, item.path);
                return (
                  <Link
                    key={item.path}
                    className="site-header__nav-link"
                    href={href}
                    aria-current={isCurrentPath(pathname, href) ? "page" : undefined}
                  >
                    {copy[item.label]}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="site-header__utilities">
            <Link className="site-header__utility-link" href={localePath(locale, "/saved")}>
              {copy.saved}
            </Link>
            <Link className="site-header__utility-link" href={localePath(locale, "/profile")}>
              {copy.profile}
            </Link>
            <Link className="site-header__sign-in" href={localePath(locale, "/login")}>
              {copy.signIn}
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            className="site-header__menu-toggle"
            type="button"
            aria-label={menuOpen ? copy.closeMenu : copy.menu}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="site-header__menu-label">{copy.menu}</span>
            <span className="site-header__menu-icon" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      <MobileNav
        locale={locale}
        open={menuOpen}
        onClose={closeMenu}
        returnFocusRef={menuButtonRef}
      />
    </>
  );
}
