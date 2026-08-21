# Veya

Veya is a curated travel discovery platform. This release proves one public-first journey:

`Home -> Explore -> Detail -> Save -> Sign in/Profile -> Express interest -> Operator inbox`

The canonical application is the Next.js app. The earlier AC Travel static site and its Apps Script request bridge remain in the repository as legacy source, but they are not canonical platform storage.

## Release scope

- English-only public and account routes.
- Place, Journey, Opportunity, and Creator discovery.
- Cards, list, filters, search, and Leaflet map views.
- Guest saves in browser storage and authenticated save synchronization.
- Email magic-link authentication and a lightweight traveler profile.
- Idempotent interest requests stored in Supabase and visible to operator/admin roles.
- Seed content mode for deterministic local review and Supabase content mode for production.

Booking, payments, chat, public people discovery, projects, advanced matching, and a full creator CMS are outside this release.

## Local setup

Use Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/en`.

The default `VEYA_CONTENT_SOURCE=seed` keeps public discovery runnable without a database. Account and interest features require the dedicated Veya Supabase values in `.env.local`. Never use credentials from another ecosystem project.

## Veya Supabase handoff

1. Confirm the target project is Veya before linking or applying anything.
2. Apply `supabase/migrations/20260821124330_veya_vertical_mvp.sql` to that project.
3. Regenerate `lib/supabase/database.types.ts` from the linked Veya schema and review the diff.
4. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Add the deployed `/auth/callback` URL to Supabase Auth redirects and set the canonical `NEXT_PUBLIC_SITE_URL`.
6. Assign `app_metadata.role` as `operator` or `admin` only through a trusted administrative path. User metadata is never accepted for authorization.
7. Set `VEYA_CONTENT_SOURCE=supabase` only after the migration, seed verification, and public-content read check pass.

Supabase is canonical for profiles, authenticated saves, and interest requests. The old Sheets/Apps Script pipeline may be used later as a secondary notification bridge, not as platform storage.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

After starting the production build, browser-check desktop and mobile for Home, Explore filters and views, a detail, guest save persistence, sign-in continuation, profile persistence, interest creation, and the operator inbox. Database acceptance also requires live anonymous/traveler/operator RLS checks against the dedicated Veya project.
