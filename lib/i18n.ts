export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];

export type LocalizedText = {
  en: string;
  ru?: string;
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function pickText(value: LocalizedText, locale: Locale): string {
  return value[locale];
}

const copy = {
  en: {
    skip: "Skip to content",
    brandAria: "Veya home",
    navAria: "Main navigation",
    explore: "Explore",
    map: "Map",
    journeys: "Journeys",
    opportunities: "Opportunities",
    creators: "Creators",
    saved: "Saved",
    profile: "My profile",
    signIn: "Sign in",
    menu: "Menu",
    closeMenu: "Close menu",
    footerLine: "A map of ways to experience the world.",
    footerExplore: "Explore the world",
    footerCreate: "Create a travel profile",
    loading: "Loading possibilities",
    retry: "Try again",
    notFoundTitle: "This path is not on the map",
    notFoundText: "The page may have moved, or the possibility is no longer published.",
    backExplore: "Back to Explore",
  },
} as const;

export function getCopy(locale: Locale) {
  return copy[locale];
}

export function localePath(locale: Locale, path = ""): string {
  const suffix = path === "/" ? "" : path;
  return `/${locale}${suffix}`;
}
