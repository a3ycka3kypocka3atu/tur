export const SITE_NAME = "Veya";
export const SITE_TAGLINE = "A map of ways to experience the world.";

export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(configured || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getContentSource(): "seed" | "supabase" {
  return process.env.VEYA_CONTENT_SOURCE === "supabase" ? "supabase" : "seed";
}
