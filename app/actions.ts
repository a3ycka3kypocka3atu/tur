"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formString,
  listFromForm,
  nullableFormString,
  validSavedReferences,
} from "@/lib/account";
import { getVerifiedAccount } from "@/lib/auth";
import type { SavedReference } from "@/lib/saved";
import {
  MVP_DISCOVERABLE_KINDS,
  type MvpDiscoverableKind,
} from "@/lib/types";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type SaveMutationResult = ActionResult & {
  mode: "local" | "remote";
};

function fallbackPublicName(email: string | null): string {
  const candidate = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return candidate?.slice(0, 80) || "Veya traveler";
}

function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isMvpKind(value: string): value is MvpDiscoverableKind {
  return MVP_DISCOVERABLE_KINDS.includes(value as MvpDiscoverableKind);
}

async function ensureProfile(
  account: Extract<Awaited<ReturnType<typeof getVerifiedAccount>>, { mode: "authenticated" }>,
): Promise<boolean> {
  const { error } = await account.client.from("profiles").upsert(
    {
      id: account.user.id,
      public_name: fallbackPublicName(account.user.email),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  return !error;
}

async function findPublishedContent(
  account: Extract<Awaited<ReturnType<typeof getVerifiedAccount>>, { mode: "authenticated" }>,
  kind: MvpDiscoverableKind,
  slug: string,
): Promise<{ id: string } | null> {
  const { data, error } = await account.client
    .from("content_items")
    .select("id")
    .eq("kind", kind)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return error || !data || typeof data.id !== "string" ? null : { id: data.id };
}

export async function saveProfileAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const account = await getVerifiedAccount();
  if (account.mode !== "authenticated") {
    return { ok: false, message: "Sign in again before saving your profile." };
  }

  const publicName = formString(formData, "public_name", 80);
  const website = formString(formData, "website", 2000);
  if (!publicName) return { ok: false, message: "Add a public name before saving." };
  if (!isHttpUrl(website)) {
    return { ok: false, message: "Use a complete http or https address for your website." };
  }

  const { data, error } = await account.client
    .from("profiles")
    .upsert(
      {
        id: account.user.id,
        public_name: publicName,
        country: nullableFormString(formData, "country", 120),
        region: nullableFormString(formData, "region", 160),
        languages: listFromForm(formData, "languages", 20),
        introduction: nullableFormString(formData, "introduction", 1200),
        travel_interests: listFromForm(formData, "travel_interests", 40),
        preferred_environments: listFromForm(formData, "preferred_environments", 40),
        travel_styles: listFromForm(formData, "travel_styles", 40),
        travel_goals: nullableFormString(formData, "travel_goals", 1200),
        social_links: website ? { website } : {},
      },
      { onConflict: "id" },
    )
    .select("id")
    .single();

  if (error || data?.id !== account.user.id) {
    return { ok: false, message: "Your profile could not be saved. Your entries are still here." };
  }

  revalidatePath("/en/profile");
  return { ok: true, message: "Profile saved." };
}

export async function syncSavedAction(references: unknown): Promise<ActionResult> {
  const account = await getVerifiedAccount();
  if (account.mode !== "authenticated") {
    return { ok: false, message: "Sign in to sync saved items." };
  }

  const valid = validSavedReferences(references);
  if (valid.length === 0) return { ok: true, message: "No supported local saves to sync." };
  if (!(await ensureProfile(account))) {
    return { ok: false, message: "Saved items could not be synced right now." };
  }

  const slugs = [...new Set(valid.map((item) => item.slug))];
  const { data: contentRows, error: contentError } = await account.client
    .from("content_items")
    .select("id,kind,slug")
    .eq("status", "published")
    .in("slug", slugs);

  if (contentError || !contentRows) {
    return { ok: false, message: "Saved items could not be synced right now." };
  }

  const requested = new Set(valid.map((item) => `${item.kind}:${item.slug}`));
  const rows = contentRows
    .filter(
      (row) =>
        typeof row.id === "string" &&
        typeof row.kind === "string" &&
        typeof row.slug === "string" &&
        requested.has(`${row.kind}:${row.slug}`),
    )
    .map((row) => ({ user_id: account.user.id, content_item_id: row.id as string }));

  if (rows.length === 0) {
    return { ok: false, message: "The saved items are not published in the connected Veya database yet." };
  }

  const { error: saveError } = await account.client
    .from("saved_items")
    .upsert(rows, { onConflict: "user_id,content_item_id", ignoreDuplicates: true });
  if (saveError) return { ok: false, message: "Saved items could not be synced right now." };

  const ids = rows.map((row) => row.content_item_id);
  const { count, error: confirmError } = await account.client
    .from("saved_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", account.user.id)
    .in("content_item_id", ids);

  if (confirmError || (count ?? 0) < rows.length) {
    return { ok: false, message: "Saved items could not be confirmed after syncing." };
  }

  revalidatePath("/en/saved");
  return { ok: true, message: `${rows.length} saved item${rows.length === 1 ? "" : "s"} synced.` };
}

export async function toggleSavedAction(reference: SavedReference, saved: boolean): Promise<SaveMutationResult> {
  if (!reference || !isMvpKind(reference.kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reference.slug)) {
    return { ok: false, mode: "local", message: "This item cannot be saved." };
  }

  const account = await getVerifiedAccount();
  if (account.mode !== "authenticated") {
    return { ok: true, mode: "local", message: "Saved in this browser." };
  }
  if (!(await ensureProfile(account))) {
    return { ok: false, mode: "remote", message: "The account save could not be prepared." };
  }

  const content = await findPublishedContent(account, reference.kind, reference.slug);
  if (!content) {
    return { ok: false, mode: "remote", message: "This item is not published in the connected Veya database." };
  }

  if (saved) {
    const { error } = await account.client.from("saved_items").insert({
      user_id: account.user.id,
      content_item_id: content.id,
    });
    if (error && error.code !== "23505") {
      return { ok: false, mode: "remote", message: "The account save failed. It remains saved in this browser." };
    }
  } else {
    const { error } = await account.client
      .from("saved_items")
      .delete()
      .eq("user_id", account.user.id)
      .eq("content_item_id", content.id);
    if (error) {
      return { ok: false, mode: "remote", message: "The account save could not be removed." };
    }
  }

  revalidatePath("/en/saved");
  return { ok: true, mode: "remote", message: saved ? "Saved to your account." : "Removed from your account." };
}

export type InterestSubmissionInput = {
  kind: MvpDiscoverableKind;
  slug: string;
  message: string;
  consent: boolean;
  submissionKey: string;
  website?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitInterestAction(input: InterestSubmissionInput): Promise<ActionResult & { id?: string }> {
  const account = await getVerifiedAccount();
  if (account.mode !== "authenticated") {
    return { ok: false, message: "Sign in before sending interest." };
  }
  if (
    !input ||
    !isMvpKind(input.kind) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) ||
    !UUID_PATTERN.test(input.submissionKey) ||
    input.website
  ) {
    return { ok: false, message: "Check the form and try again." };
  }

  const message = input.message.trim();
  if (message.length < 10 || message.length > 4000) {
    return { ok: false, message: "Write 10 to 4000 characters about what interests you." };
  }
  if (!input.consent) {
    return { ok: false, message: "Confirm that Veya may use these details to respond to this request." };
  }
  if (!account.user.email) {
    return { ok: false, message: "Your account needs a verified email address before sending interest." };
  }

  const { data, error } = await account.client
    .rpc("submit_interest_request", {
      p_kind: input.kind,
      p_slug: input.slug,
      p_message: message,
      p_submission_key: input.submissionKey,
      p_consent: input.consent,
    });

  if (error) {
    if (error.message.includes("rate_limited")) {
      return { ok: false, message: "You have sent several requests recently. Try again in about an hour." };
    }
    if (error.message.includes("profile_required")) {
      return { ok: false, message: "Create your travel profile before sending interest." };
    }
    if (error.message.includes("content_unavailable")) {
      return { ok: false, message: "This possibility is not available for interest right now." };
    }
    return { ok: false, message: "Your request was not saved. Your message is still here so you can try again." };
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result || typeof result.request_id !== "string") {
    return { ok: false, message: "Your request was not saved. Your message is still here so you can try again." };
  }

  revalidatePath("/en/interests");
  revalidatePath("/en/admin");
  return {
    ok: true,
    id: result.request_id,
    message: result.was_duplicate
      ? "Your interest was already received."
      : "Your interest is saved. Veya can now review and respond to it.",
  };
}

export async function updateInterestStatusAction(formData: FormData): Promise<void> {
  const account = await getVerifiedAccount();
  if (
    account.mode !== "authenticated" ||
    !account.roleSynchronized ||
    (account.role !== "operator" && account.role !== "admin")
  ) {
    return;
  }

  const id = formString(formData, "id", 80);
  const status = formString(formData, "status", 20);
  const adminNotes = nullableFormString(formData, "admin_notes", 4000);
  if (
    !UUID_PATTERN.test(id) ||
    (status !== "new" && status !== "contacted" && status !== "closed")
  ) return;

  await account.client
    .from("interest_requests")
    .update({ status, admin_notes: adminNotes })
    .eq("id", id)
    .select("id")
    .single();
  revalidatePath("/en/admin");
}

export async function signOutAction(): Promise<void> {
  const account = await getVerifiedAccount();
  if (account.mode === "authenticated") await account.client.auth.signOut();
  redirect("/en");
}
