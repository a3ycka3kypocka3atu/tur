import type { MetadataRoute } from "next";
import { discoverables } from "@/lib/content/seed";
import { locales } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site";

const publicRoutes = [
  "",
  "/explore",
  "/map",
  "/places",
  "/journeys",
  "/opportunities",
  "/creators",
] as const;

const releaseKinds = new Set(["place", "journey", "opportunity", "creator"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl().origin;
  const paths = [
    ...publicRoutes,
    ...discoverables
      .filter((item) => releaseKinds.has(item.kind))
      .map((item) => `/discover/${item.kind}/${item.slug}`),
  ];

  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${origin}/${locale}${path}`,
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/explore" || path === "/map" ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternateLocale) => [
            alternateLocale,
            `${origin}/${alternateLocale}${path}`,
          ]),
        ),
      },
    })),
  );
}
