"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type RefObject,
} from "react";
import { getCopy, localePath, type Locale } from "@/lib/i18n";

type MobileNavProps = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hidden && element.getClientRects().length > 0,
  );
}

export function MobileNav({
  locale,
  open,
  onClose,
  returnFocusRef,
}: MobileNavProps) {
  const copy = getCopy(locale);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = document.createElement("div");
    node.className = "mobile-nav-portal";
    node.dataset.veyaMobileNavPortal = "";
    document.body.append(node);
    setPortalNode(node);

    return () => {
      node.remove();
    };
  }, []);

  useEffect(() => {
    if (!open || !portalNode) return;

    const appShell = document.querySelector<HTMLElement>("[data-veya-app-shell]");
    const previousBodyOverflow = document.body.style.overflow;
    const previousAriaHidden = appShell?.getAttribute("aria-hidden") ?? null;
    const previousInert = appShell?.inert ?? false;

    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    if (appShell) {
      appShell.inert = true;
      appShell.setAttribute("aria-hidden", "true");
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusableElements = getFocusableElements(panelRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!panelRef.current.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (appShell) {
        appShell.inert = previousInert;
        if (previousAriaHidden === null) {
          appShell.removeAttribute("aria-hidden");
        } else {
          appShell.setAttribute("aria-hidden", previousAriaHidden);
        }
      }

      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [onClose, open, portalNode, returnFocusRef]);

  if (!open || !portalNode) return null;

  const closeFromLink = () => onClose();
  const closeFromBackdrop: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="mobile-nav"
      data-state="open"
      style={{ minHeight: "100dvh" }}
      onMouseDown={closeFromBackdrop}
    >
      <div
        ref={panelRef}
        className="mobile-nav__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
      >
        <div className="mobile-nav__header">
          <p id="mobile-navigation-title" className="mobile-nav__title">
            <span className="mobile-nav__brand">Veya</span>
            <span>{copy.menu}</span>
          </p>
          <button
            ref={closeButtonRef}
            className="mobile-nav__close"
            type="button"
            aria-label={copy.closeMenu}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav id="mobile-navigation" className="mobile-nav__navigation" aria-label={copy.navAria}>
          <div className="mobile-nav__primary-links">
            <Link href={localePath(locale, "/explore")} onClick={closeFromLink}>
              {copy.explore}
            </Link>
            <Link href={localePath(locale, "/map")} onClick={closeFromLink}>
              {copy.map}
            </Link>
            <Link href={localePath(locale, "/journeys")} onClick={closeFromLink}>
              {copy.journeys}
            </Link>
            <Link href={localePath(locale, "/opportunities")} onClick={closeFromLink}>
              {copy.opportunities}
            </Link>
            <Link href={localePath(locale, "/creators")} onClick={closeFromLink}>
              {copy.creators}
            </Link>
          </div>
        </nav>

        <div className="mobile-nav__utilities" role="group" aria-label={copy.profile}>
          <Link href={localePath(locale, "/saved")} onClick={closeFromLink}>
            {copy.saved}
          </Link>
          <Link href={localePath(locale, "/profile")} onClick={closeFromLink}>
            {copy.profile}
          </Link>
          <Link href={localePath(locale, "/login")} onClick={closeFromLink}>
            {copy.signIn}
          </Link>
        </div>
      </div>
    </div>,
    portalNode,
  );
}
