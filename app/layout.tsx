import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Discover meaningful places, journeys, creators and opportunities through Veya.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/en",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "Explore places, journeys, creators and opportunities in one curated travel world.",
    images: [
      {
        url: "/assets/veya-world.png",
        width: 1536,
        height: 1024,
        alt: "An illustrated Veya world of routes, places and people",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "Explore places, journeys, creators and opportunities in one curated travel world.",
    images: ["/assets/veya-world.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#14251f" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
