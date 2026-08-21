import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl().origin;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/en/admin", "/en/profile", "/en/saved", "/en/interests"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
