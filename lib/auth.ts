import "server-only";

import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type AccountRole = "traveler" | "creator" | "operator" | "admin";

type AccountClient = Awaited<ReturnType<typeof createClient>>;

export type LocalAccount = {
  mode: "local";
  configured: false;
  role: "traveler";
  roleSynchronized: true;
  user: null;
  client: null;
};

export type AnonymousAccount = {
  mode: "anonymous";
  configured: true;
  role: "traveler";
  roleSynchronized: true;
  user: null;
  client: AccountClient;
};

export type AuthenticatedAccount = {
  mode: "authenticated";
  configured: true;
  role: AccountRole;
  roleSynchronized: boolean;
  user: {
    id: string;
    email: string | null;
  };
  client: AccountClient;
};

export type AccountAuth = LocalAccount | AnonymousAccount | AuthenticatedAccount;
export type ProtectedAccount = LocalAccount | AuthenticatedAccount;

function appRole(metadata: Record<string, unknown> | null | undefined): AccountRole {
  const role = metadata?.role;
  return role === "creator" || role === "operator" || role === "admin" || role === "traveler"
    ? role
    : "traveler";
}

/**
 * Establishes identity from a verified JWT and then confirms that identity with
 * the Auth server. Privileged roles must agree in both immutable app_metadata
 * sources; a stale or mismatched role is deliberately treated as traveler.
 */
export async function getVerifiedAccount(): Promise<AccountAuth> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "local",
      configured: false,
      role: "traveler",
      roleSynchronized: true,
      user: null,
      client: null,
    };
  }

  const client = await createClient();

  try {
    const { data: claimsData, error: claimsError } = await client.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) {
      return anonymousAccount(client);
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user || user.id !== claimsData.claims.sub) {
      return anonymousAccount(client);
    }

    const claimedRole = appRole(claimsData.claims.app_metadata);
    const currentRole = appRole(user.app_metadata);
    const roleSynchronized = claimedRole === currentRole;

    return {
      mode: "authenticated",
      configured: true,
      role: roleSynchronized ? currentRole : "traveler",
      roleSynchronized,
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      client,
    };
  } catch {
    return anonymousAccount(client);
  }
}

function anonymousAccount(client: AccountClient): AnonymousAccount {
  return {
    mode: "anonymous",
    configured: true,
    role: "traveler",
    roleSynchronized: true,
    user: null,
    client,
  };
}

export async function getProtectedAccount(
  locale: Locale,
  nextPath: string,
): Promise<ProtectedAccount> {
  const account = await getVerifiedAccount();
  if (account.mode === "anonymous") {
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }
  return account;
}

export function hasAccountRole(
  account: ProtectedAccount,
  role: "creator" | "operator" | "admin",
): account is AuthenticatedAccount {
  return account.mode === "authenticated" && account.roleSynchronized && account.role === role;
}
