import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/site";
import type { Database } from "@/lib/supabase/database.types";

const protectedSegments = ["/profile", "/interests", "/admin"];

function isProtectedPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/en(?=\/|$)/, "");
  return protectedSegments.some(
    (segment) => withoutLocale === segment || withoutLocale.startsWith(`${segment}/`),
  );
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(cacheHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  // Current Supabase SSR guidance requires getClaims here. It validates the
  // JWT signature and refreshes cookies without trusting a spoofable session.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && isProtectedPath(request.nextUrl.pathname)) {
    const locale = "en";
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
