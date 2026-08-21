import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260821124330_veya_vertical_mvp.sql",
);
const schema = fs.readFileSync(schemaPath, "utf8");
const compact = schema.replace(/\s+/g, " ").trim().toLowerCase();
const tables = ["profiles", "content_items", "saved_items", "interest_requests"];

function policy(name: string): string {
  const match = schema.match(new RegExp(`create\\s+policy\\s+${name}\\b[\\s\\S]*?;`, "i"));
  assert.ok(match, `missing policy ${name}`);
  return match[0].replace(/\s+/g, " ").toLowerCase();
}

function enumBody(name: string): string {
  const match = schema.match(
    new RegExp(`create\\s+type\\s+public\\.${name}\\s+as\\s+enum\\s*\\(([\\s\\S]*?)\\);`, "i"),
  );
  assert.ok(match, `missing enum ${name}`);
  return match[1].toLowerCase();
}

test("migration and canonical schema stay synchronized", () => {
  assert.equal(fs.readFileSync(migrationPath, "utf8").trim(), schema.trim());
});

test("defines only the four release entities and minimum account tables", () => {
  for (const table of tables) {
    assert.match(compact, new RegExp(`create table public\\.${table} \\(`));
  }
  assert.doesNotMatch(compact, /create table public\.(people|projects|feedback|content_relations)/);

  const kinds = enumBody("content_kind");
  for (const kind of ["place", "journey", "opportunity", "creator"]) {
    assert.match(kinds, new RegExp(`'${kind}'`));
  }
  assert.doesNotMatch(kinds, /'(person|project)'/);

  const statuses = enumBody("content_status");
  assert.match(statuses, /'draft'/);
  assert.match(statuses, /'published'/);
  assert.match(statuses, /'archived'/);
});

test("validates English content, coordinates, media and JSON payloads", () => {
  assert.match(compact, /content_items_kind_slug_unique unique \(kind, slug\)/);
  assert.match(compact, /jsonb_typeof\(title_i18n -> 'en'\) = 'string'/);
  assert.match(compact, /jsonb_typeof\(summary_i18n -> 'en'\) = 'string'/);
  assert.match(compact, /content_items_payload_object check \(jsonb_typeof\(payload\) = 'object'\)/);
  assert.match(compact, /content_items_images_limit check \(cardinality\(image_urls\) between 1 and 24\)/);
  assert.match(compact, /latitude between -90 and 90/);
  assert.match(compact, /longitude between -180 and 180/);
  assert.match(compact, /status <> 'published' or published_at is not null/);
});

test("seeds the complete 17-item core release idempotently", () => {
  const values = schema.match(/values([\s\S]*?)on conflict \(kind, slug\) do update/i)?.[1] ?? "";
  const seededRows = values.match(/\('(place|journey|opportunity|creator)'/g) ?? [];
  assert.equal(seededRows.length, 17);
  assert.match(compact, /on conflict \(kind, slug\) do update/);
  assert.match(compact, /payload = excluded\.payload/);
  assert.match(compact, /published_at = coalesce\(public\.content_items\.published_at, excluded\.published_at\)/);
});

test("enables RLS and revokes implicit table access everywhere", () => {
  for (const table of tables) {
    assert.match(compact, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(compact, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`));
  }
  assert.match(compact, /grant select on table public\.content_items to anon;/);
  assert.doesNotMatch(compact, /grant select[^;]*public\.(profiles|saved_items|interest_requests)[^;]*to anon/);
  assert.doesNotMatch(compact, /grant insert on table public\.interest_requests to authenticated/);
});

test("keeps traveler profile and save rows owner scoped", () => {
  for (const name of [
    "profiles_select_own",
    "profiles_insert_own",
    "profiles_update_own",
    "saved_items_select_own",
    "saved_items_insert_own",
    "saved_items_delete_own",
  ]) {
    assert.match(policy(name), /\(select auth\.uid\(\)\)/);
  }
  assert.match(policy("profiles_update_own"), /using \([^;]*auth\.uid\(\)/);
  assert.match(policy("profiles_update_own"), /with check \([^;]*auth\.uid\(\)/);
  assert.match(policy("saved_items_insert_own"), /saved_content\.status = 'published'/);
  assert.match(compact, /saved_items_unique unique \(user_id, content_item_id\)/);
});

test("uses one narrowly granted RPC for confirmed, rate-limited interest creation", () => {
  assert.match(compact, /create function public\.submit_interest_request\(/);
  assert.match(compact, /security definer set search_path = ''/);
  assert.match(compact, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(compact, /v_email text := coalesce\(auth\.jwt\(\) ->> 'email', ''\)/);
  assert.match(compact, /pg_advisory_xact_lock\(hashtextextended\(v_user_id::text, 0\)\)/);
  assert.match(compact, /recent_request\.created_at >= now\(\) - interval '1 hour'/);
  assert.match(compact, /\) >= 5 then raise exception/);
  assert.match(compact, /content\.status = 'published'/);
  assert.match(compact, /btrim\(p_message\)/);
  assert.match(compact, /contact_email, message, consent_version/);
  assert.match(compact, /revoke all on function public\.submit_interest_request\([^;]+from public, anon;/);
  assert.match(compact, /grant execute on function public\.submit_interest_request\([^;]+to authenticated;/);
  assert.match(compact, /grant select on table public\.interest_requests to authenticated;/);
  assert.doesNotMatch(compact, /grant (?:select, )?insert on table public\.interest_requests/);
});

test("enforces idempotency and one active request per user and item", () => {
  assert.match(compact, /interest_requests_idempotent unique \(user_id, idempotency_key\)/);
  assert.match(compact, /create unique index interest_requests_one_active_per_item_idx/);
  assert.match(compact, /where status in \('new', 'contacted'\)/);
  assert.match(compact, /when unique_violation then/);
  assert.match(compact, /request\.idempotency_key = p_submission_key/);
});

test("keeps operator reads role-bound and operator updates column-limited", () => {
  for (const name of ["interest_requests_operator_select", "interest_requests_operator_update"]) {
    const operatorPolicy = policy(name);
    assert.match(operatorPolicy, /'app_metadata'/);
    assert.match(operatorPolicy, /'role'/);
    assert.match(operatorPolicy, /in \('operator', 'admin'\)/);
  }
  assert.match(compact, /grant update \(status, admin_notes\) on table public\.interest_requests to authenticated;/);
  assert.doesNotMatch(compact, /user_metadata/);
  assert.doesNotMatch(compact, /grant update on table public\.interest_requests/);
});

test("uses an invoker trigger and indexes every high-frequency relation", () => {
  assert.match(compact, /create function public\.set_updated_at\(\) returns trigger language plpgsql security invoker/);
  assert.match(compact, /revoke all on function public\.set_updated_at\(\) from public, anon, authenticated;/);
  for (const index of [
    "content_items_owner_id_idx",
    "content_items_published_listing_idx",
    "content_items_travel_styles_idx",
    "saved_items_user_id_idx",
    "saved_items_content_item_id_idx",
    "interest_requests_user_created_idx",
    "interest_requests_content_item_id_idx",
    "interest_requests_operator_queue_idx",
  ]) {
    assert.match(compact, new RegExp(`create (?:unique )?index ${index} `));
  }
});
