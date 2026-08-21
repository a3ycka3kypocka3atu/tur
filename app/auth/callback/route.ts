import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/site";

function safeNext(value: string | null): string {
  return value && /^\/en(\/|$)/.test(value) && !value.startsWith("//") ? value : "/en/profile";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/en/login?error=auth", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/en/login?error=auth", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
