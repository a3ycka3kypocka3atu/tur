import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Veya",
    short_name: "Veya",
    description: "A curated map of meaningful places, journeys, creators and opportunities.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#19352a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
