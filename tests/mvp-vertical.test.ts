import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("ships every route in the first public and account journey", () => {
  const routes = [
    "app/[locale]/page.tsx",
    "app/[locale]/explore/page.tsx",
    "app/[locale]/map/page.tsx",
    "app/[locale]/places/page.tsx",
    "app/[locale]/journeys/page.tsx",
    "app/[locale]/opportunities/page.tsx",
    "app/[locale]/creators/page.tsx",
    "app/[locale]/discover/[kind]/[slug]/page.tsx",
    "app/[locale]/login/page.tsx",
    "app/[locale]/profile/page.tsx",
    "app/[locale]/saved/page.tsx",
    "app/[locale]/interests/page.tsx",
    "app/[locale]/admin/page.tsx",
  ];
  routes.forEach((route) => assert.equal(fs.existsSync(path.join(root, route)), true, route));
  assert.match(read("app/page.tsx"), /redirect\("\/en"\)/);
});

test("keeps the visible shell English-only and free of dead MVP navigation", () => {
  const shell = [
    "components/site-header.tsx",
    "components/mobile-nav.tsx",
    "components/site-footer.tsx",
    "app/sitemap.ts",
    "app/manifest.ts",
  ].map(read).join("\n");
  assert.doesNotMatch(shell, /\/ru|\/people|\/projects|\/travel-styles|\/studio|\/feedback|\/privacy|\/concierge/);
  assert.doesNotMatch(shell, /[А-Яа-яЁё]/u);
  assert.doesNotMatch(shell, /[\u2013\u2014]/u);
});

test("serves every release image from Next public assets", () => {
  for (const name of [
    "veya-world.png",
    "albania-coast-road.jpg",
    "community-hero.jpg",
    "community-table.png",
  ]) {
    const file = path.join(root, "public", "assets", name);
    assert.equal(fs.existsSync(file), true, name);
    assert.ok(fs.statSync(file).size > 1000, `${name} should not be an empty placeholder`);
  }
});

test("uses an explicit content source and never silently falls back from Supabase", () => {
  const repository = read("lib/content/repository.ts");
  const site = read("lib/site.ts");
  assert.match(site, /VEYA_CONTENT_SOURCE/);
  assert.match(repository, /getContentSource\(\) === "seed"/);
  assert.match(repository, /throw new PublicContentUnavailableError\(\)/);
  assert.doesNotMatch(repository, /catch\s*\([^)]*\)\s*\{[^}]*seedResult/s);
});

test("validates auth on the server and synchronizes privileged role claims", () => {
  const auth = read("lib/auth.ts");
  const client = read("lib/supabase/client.ts");
  const server = read("lib/supabase/server.ts");
  assert.match(auth, /auth\.getClaims\(\)/);
  assert.match(auth, /auth\.getUser\(\)/);
  assert.match(auth, /user\.id !== claimsData\.claims\.sub/);
  assert.match(auth, /claimedRole === currentRole/);
  assert.match(auth, /roleSynchronized/);
  assert.doesNotMatch(auth, /user_metadata/);
  assert.match(client, /createBrowserClient<Database>/);
  assert.match(server, /createServerClient<Database>/);
  assert.equal(fs.existsSync(path.join(root, "lib/supabase/admin.ts")), false);
  assert.doesNotMatch(read(".env.example"), /SUPABASE_SECRET_KEY|service_role/);
});

test("persists interest through the guarded RPC and confirms an id before success", () => {
  const actions = read("app/actions.ts");
  const form = read("components/interest-form.tsx");
  assert.match(actions, /rpc\("submit_interest_request"/);
  assert.doesNotMatch(actions, /from\("interest_requests"\)\s*\.insert/);
  assert.match(actions, /typeof result\.request_id !== "string"/);
  assert.match(actions, /revalidatePath\("\/en\/admin"\)/);
  assert.match(form, /window\.crypto\.randomUUID\(\)/);
  assert.match(form, /if \(result\.ok\) \{/);
  assert.match(form, /setMessage\(""\)/);
  assert.match(actions, /Your message is still here/);
});

test("protects profile, interest history and operator routes before rendering data", () => {
  const proxy = read("lib/supabase/proxy.ts");
  const admin = read("app/[locale]/admin/page.tsx");
  const actions = read("app/actions.ts");
  assert.match(proxy, /"\/profile", "\/interests", "\/admin"/);
  assert.match(admin, /account\.role === "operator" \|\| account\.role === "admin"/);
  assert.match(admin, /account\.roleSynchronized/);
  assert.match(actions, /account\.role !== "operator" && account\.role !== "admin"/);
});
