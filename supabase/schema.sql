begin;

-- Canonical Veya vertical-MVP schema. Keep this file synchronized with the
-- CLI-generated migration in supabase/migrations.

create type public.content_kind as enum (
  'place',
  'journey',
  'opportunity',
  'creator'
);

create type public.content_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.interest_request_status as enum (
  'new',
  'contacted',
  'closed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_name text not null,
  country text,
  region text,
  languages text[] not null default '{}',
  introduction text,
  travel_interests text[] not null default '{}',
  preferred_environments text[] not null default '{}',
  travel_styles text[] not null default '{}',
  travel_goals text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_public_name_length check (
    char_length(btrim(public_name)) between 1 and 80
  ),
  constraint profiles_country_length check (
    country is null or char_length(country) <= 120
  ),
  constraint profiles_region_length check (
    region is null or char_length(region) <= 160
  ),
  constraint profiles_introduction_length check (
    introduction is null or char_length(introduction) <= 1200
  ),
  constraint profiles_travel_goals_length check (
    travel_goals is null or char_length(travel_goals) <= 1200
  ),
  constraint profiles_languages_limit check (cardinality(languages) <= 20),
  constraint profiles_interests_limit check (cardinality(travel_interests) <= 40),
  constraint profiles_environments_limit check (cardinality(preferred_environments) <= 40),
  constraint profiles_styles_limit check (cardinality(travel_styles) <= 40),
  constraint profiles_social_links_object check (jsonb_typeof(social_links) = 'object')
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  kind public.content_kind not null,
  status public.content_status not null default 'draft',
  slug text not null,
  title_i18n jsonb not null,
  summary_i18n jsonb not null default '{}'::jsonb,
  location_name text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  travel_styles text[] not null default '{}',
  image_urls text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_kind_slug_unique unique (kind, slug),
  constraint content_items_slug_format check (
    char_length(slug) between 1 and 160
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint content_items_title_object check (
    jsonb_typeof(title_i18n) = 'object'
    and jsonb_typeof(title_i18n -> 'en') = 'string'
    and char_length(btrim(title_i18n ->> 'en')) between 1 and 160
  ),
  constraint content_items_summary_object check (
    jsonb_typeof(summary_i18n) = 'object'
    and jsonb_typeof(summary_i18n -> 'en') = 'string'
    and char_length(btrim(summary_i18n ->> 'en')) between 1 and 1200
  ),
  constraint content_items_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint content_items_location_length check (char_length(location_name) between 1 and 240),
  constraint content_items_styles_limit check (cardinality(travel_styles) <= 40),
  constraint content_items_images_limit check (cardinality(image_urls) between 1 and 24),
  constraint content_items_latitude_range check (latitude between -90 and 90),
  constraint content_items_longitude_range check (longitude between -180 and 180),
  constraint content_items_published_timestamp check (
    status <> 'published' or published_at is not null
  )
);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_items_unique unique (user_id, content_item_id)
);

create table public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  idempotency_key uuid not null,
  status public.interest_request_status not null default 'new',
  contact_name text not null,
  contact_email text not null,
  message text not null,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interest_requests_idempotent unique (user_id, idempotency_key),
  constraint interest_requests_contact_name_length check (
    char_length(btrim(contact_name)) between 1 and 160
  ),
  constraint interest_requests_email_shape check (
    char_length(contact_email) <= 254 and position('@' in contact_email) > 1
  ),
  constraint interest_requests_message_length check (
    char_length(btrim(message)) between 10 and 4000
  ),
  constraint interest_requests_consent_version check (
    char_length(btrim(consent_version)) between 1 and 120
  ),
  constraint interest_requests_admin_notes_length check (
    admin_notes is null or char_length(admin_notes) <= 4000
  )
);

create index content_items_owner_id_idx on public.content_items (owner_id);
create index content_items_published_listing_idx
  on public.content_items (kind, featured desc, published_at desc)
  where status = 'published';
create index content_items_travel_styles_idx on public.content_items using gin (travel_styles);
create index saved_items_user_id_idx on public.saved_items (user_id);
create index saved_items_content_item_id_idx on public.saved_items (content_item_id);
create index interest_requests_user_created_idx
  on public.interest_requests (user_id, created_at desc);
create index interest_requests_content_item_id_idx
  on public.interest_requests (content_item_id);
create index interest_requests_operator_queue_idx
  on public.interest_requests (status, created_at desc);
create unique index interest_requests_one_active_per_item_idx
  on public.interest_requests (user_id, content_item_id)
  where status in ('new', 'contacted');

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create trigger interest_requests_set_updated_at
before update on public.interest_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.content_items enable row level security;
alter table public.saved_items enable row level security;
alter table public.interest_requests enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy content_items_select_published
on public.content_items for select
to anon, authenticated
using (status = 'published');

create policy content_items_admin_all
on public.content_items for all
to authenticated
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy saved_items_select_own
on public.saved_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy saved_items_insert_own
on public.saved_items for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.content_items as saved_content
    where saved_content.id = content_item_id
      and saved_content.status = 'published'
  )
);

create policy saved_items_delete_own
on public.saved_items for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy interest_requests_select_own
on public.interest_requests for select
to authenticated
using ((select auth.uid()) = user_id);

create policy interest_requests_operator_select
on public.interest_requests for select
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('operator', 'admin')
);

create policy interest_requests_operator_update
on public.interest_requests for update
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('operator', 'admin')
)
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('operator', 'admin')
);

create function public.submit_interest_request(
  p_kind public.content_kind,
  p_slug text,
  p_message text,
  p_submission_key uuid,
  p_consent boolean
)
returns table (request_id uuid, was_duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_public_name text;
  v_content_id uuid;
  v_request_id uuid;
begin
  if v_user_id is null or v_email = '' then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  if p_consent is not true
    or char_length(btrim(p_message)) not between 10 and 4000
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then
    raise exception using errcode = 'P0001', message = 'invalid_interest_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select profile.public_name
  into v_public_name
  from public.profiles as profile
  where profile.id = v_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'profile_required';
  end if;

  select content.id
  into v_content_id
  from public.content_items as content
  where content.kind = p_kind
    and content.slug = p_slug
    and content.status = 'published';
  if not found then
    raise exception using errcode = 'P0001', message = 'content_unavailable';
  end if;

  select request.id
  into v_request_id
  from public.interest_requests as request
  where request.user_id = v_user_id
    and (
      request.idempotency_key = p_submission_key
      or (
        request.content_item_id = v_content_id
        and request.status in ('new', 'contacted')
      )
    )
  order by (request.idempotency_key = p_submission_key) desc
  limit 1;

  if v_request_id is not null then
    return query select v_request_id, true;
    return;
  end if;

  if (
    select count(*)
    from public.interest_requests as recent_request
    where recent_request.user_id = v_user_id
      and recent_request.created_at >= now() - interval '1 hour'
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'rate_limited';
  end if;

  insert into public.interest_requests (
    user_id,
    content_item_id,
    idempotency_key,
    contact_name,
    contact_email,
    message,
    consent_version
  ) values (
    v_user_id,
    v_content_id,
    p_submission_key,
    v_public_name,
    v_email,
    btrim(p_message),
    'veya-interest-v1'
  )
  returning id into v_request_id;

  return query select v_request_id, false;
exception
  when unique_violation then
    select request.id
    into v_request_id
    from public.interest_requests as request
    where request.user_id = v_user_id
      and (
        request.idempotency_key = p_submission_key
        or (
          request.content_item_id = v_content_id
          and request.status in ('new', 'contacted')
        )
      )
    limit 1;
    if v_request_id is null then
      raise exception using errcode = 'P0001', message = 'request_conflict';
    end if;
    return query select v_request_id, true;
end;
$$;

revoke all on function public.submit_interest_request(
  public.content_kind,
  text,
  text,
  uuid,
  boolean
) from public, anon;
grant execute on function public.submit_interest_request(
  public.content_kind,
  text,
  text,
  uuid,
  boolean
) to authenticated;

grant usage on schema public to anon, authenticated;
grant usage on type public.content_kind to anon, authenticated;
grant usage on type public.content_status to anon, authenticated;
grant usage on type public.interest_request_status to authenticated;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.content_items from anon, authenticated;
revoke all on table public.saved_items from anon, authenticated;
revoke all on table public.interest_requests from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.content_items to anon;
grant select, insert, update, delete on table public.content_items to authenticated;
grant select, insert, delete on table public.saved_items to authenticated;
grant select on table public.interest_requests to authenticated;
grant update (status, admin_notes) on table public.interest_requests to authenticated;

insert into public.content_items (
  kind,
  slug,
  title_i18n,
  summary_i18n,
  location_name,
  latitude,
  longitude,
  travel_styles,
  image_urls,
  payload,
  featured,
  status,
  published_at
)
values
  ('place', 'gjirokaster-stone-city', jsonb_build_object('en', 'Gjirokaster'), jsonb_build_object('en', 'A hillside city of stone lanes and layered local history in southern Albania.'), 'Gjirokaster, Albania', 40.0758, 20.1389, array['cultural-travel', 'slow-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'gjirokaster-stone-city'), true, 'published', now()),
  ('place', 'theth-albanian-alps', jsonb_build_object('en', 'Theth'), jsonb_build_object('en', 'A mountain village and trail base in the Albanian Alps.'), 'Theth, Albania', 42.395, 19.774, array['nature-travel', 'low-budget-travel', 'hitchhiking-travel']::text[], array['/assets/albania-coast-road.jpg']::text[], jsonb_build_object('seed_key', 'theth-albanian-alps'), true, 'published', now()),
  ('place', 'berat-riverside-quarters', jsonb_build_object('en', 'Berat'), jsonb_build_object('en', 'A riverside Albanian city suited to cultural walks and local food stories.'), 'Berat, Albania', 40.7058, 19.9522, array['cultural-travel', 'slow-travel', 'community-travel']::text[], array['/assets/community-hero.jpg']::text[], jsonb_build_object('seed_key', 'berat-riverside-quarters'), false, 'published', now()),
  ('place', 'himara-coast', jsonb_build_object('en', 'Himara coast'), jsonb_build_object('en', 'A southern Albanian coastal base for slower days, villages and sea landscapes.'), 'Himara, Albania', 40.1017, 19.7447, array['slow-travel', 'nature-travel', 'small-group-travel']::text[], array['/assets/albania-coast-road.jpg']::text[], jsonb_build_object('seed_key', 'himara-coast'), true, 'published', now()),
  ('place', 'lake-ohrid-shore', jsonb_build_object('en', 'Lake Ohrid shore'), jsonb_build_object('en', 'A Balkans lake setting for cultural exploration, walking and a calmer rhythm.'), 'Ohrid, North Macedonia', 41.1172, 20.8016, array['wellbeing-travel', 'cultural-travel', 'slow-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'lake-ohrid-shore'), false, 'published', now()),
  ('place', 'kotor-bay', jsonb_build_object('en', 'Kotor Bay'), jsonb_build_object('en', 'A dramatic Montenegrin bay connecting historic towns, mountains and coastal routes.'), 'Kotor, Montenegro', 42.4247, 18.7712, array['slow-travel', 'remote-work-travel', 'cultural-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'kotor-bay'), false, 'published', now()),
  ('journey', 'roads-villages-shared-tables', jsonb_build_object('en', 'Roads, villages and shared tables'), jsonb_build_object('en', 'A relaxed concept route through southern Albania, nature and small family run places.'), 'Southern Albania', 40.1017, 19.7447, array['slow-travel', 'nature-travel', 'small-group-travel']::text[], array['/assets/albania-coast-road.jpg']::text[], jsonb_build_object('seed_key', 'roads-villages-shared-tables'), true, 'published', now()),
  ('journey', 'week-of-healthy-rhythm', jsonb_build_object('en', 'A week of healthy rhythm'), jsonb_build_object('en', 'A Balkans wellbeing concept centered on food, walking, movement, rest and conversation.'), 'Balkans, place not selected', 41.1172, 20.8016, array['wellbeing-travel', 'slow-travel', 'small-group-travel']::text[], array['/assets/community-hero.jpg']::text[], jsonb_build_object('seed_key', 'week-of-healthy-rhythm'), true, 'published', now()),
  ('journey', 'home-for-living-and-working', jsonb_build_object('en', 'A home for living and working'), jsonb_build_object('en', 'A longer Mediterranean stay concept for focused work, nature and a new social circle.'), 'Mediterranean, flexible region', 42.4247, 18.7712, array['remote-work-travel', 'slow-travel', 'community-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'home-for-living-and-working'), true, 'published', now()),
  ('opportunity', 'albania-story-walk-concept', jsonb_build_object('en', 'Albania story walk concept'), jsonb_build_object('en', 'A Veya idea for a guided cultural walk shaped with a future local contributor.'), 'Gjirokaster, Albania', 40.0758, 20.1389, array['cultural-travel', 'slow-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'albania-story-walk-concept'), false, 'published', now()),
  ('opportunity', 'theth-trail-companion-interest', jsonb_build_object('en', 'Theth trail companion interest'), jsonb_build_object('en', 'A Veya interest signal for people considering a prepared mountain journey in northern Albania.'), 'Theth, Albania', 42.395, 19.774, array['nature-travel', 'small-group-travel', 'low-budget-travel']::text[], array['/assets/albania-coast-road.jpg']::text[], jsonb_build_object('seed_key', 'theth-trail-companion-interest'), false, 'published', now()),
  ('opportunity', 'berat-local-table-host-call', jsonb_build_object('en', 'Berat local table host call'), jsonb_build_object('en', 'A Veya call to discuss a respectful local food and conversation concept in Berat.'), 'Berat, Albania', 40.7058, 19.9522, array['community-travel', 'cultural-travel', 'slow-travel']::text[], array['/assets/community-table.png']::text[], jsonb_build_object('seed_key', 'berat-local-table-host-call'), false, 'published', now()),
  ('opportunity', 'balkans-wellbeing-place-call', jsonb_build_object('en', 'Balkans wellbeing place call'), jsonb_build_object('en', 'A Veya search for a suitable place to shape a calm non-medical wellbeing journey concept.'), 'Balkans, editorial anchor near Ohrid', 41.1172, 20.8016, array['wellbeing-travel', 'slow-travel']::text[], array['/assets/community-hero.jpg']::text[], jsonb_build_object('seed_key', 'balkans-wellbeing-place-call'), false, 'published', now()),
  ('opportunity', 'mediterranean-work-stay-interest', jsonb_build_object('en', 'Mediterranean work stay interest'), jsonb_build_object('en', 'A Veya interest concept for a focused longer stay with reliable working conditions.'), 'Mediterranean, editorial anchor near Kotor', 42.4247, 18.7712, array['remote-work-travel', 'slow-travel', 'community-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'mediterranean-work-stay-interest'), false, 'published', now()),
  ('opportunity', 'coastal-slow-days-interest', jsonb_build_object('en', 'Coastal slow days interest'), jsonb_build_object('en', 'A Veya interest concept for slow coastal exploration around Himara.'), 'Himara, Albania', 40.1017, 19.7447, array['slow-travel', 'nature-travel', 'small-group-travel']::text[], array['/assets/albania-coast-road.jpg']::text[], jsonb_build_object('seed_key', 'coastal-slow-days-interest'), false, 'published', now()),
  ('creator', 'veya-editorial-team', jsonb_build_object('en', 'Veya editorial team'), jsonb_build_object('en', 'The internal Veya role that researches, structures and clearly labels early discovery content.'), 'Albania and the Balkans', 41.3275, 19.8187, array['slow-travel', 'cultural-travel', 'community-travel']::text[], array['/assets/veya-world.png']::text[], jsonb_build_object('seed_key', 'veya-editorial-team'), true, 'published', now()),
  ('creator', 'albania-local-creator-call', jsonb_build_object('en', 'Albania local creator call'), jsonb_build_object('en', 'An open Veya invitation for guides, hosts and local storytellers to introduce their work.'), 'Albania', 40.0758, 20.1389, array['community-travel', 'cultural-travel', 'nature-travel']::text[], array['/assets/community-table.png']::text[], jsonb_build_object('seed_key', 'albania-local-creator-call'), false, 'published', now())
on conflict (kind, slug) do update
set
  title_i18n = excluded.title_i18n,
  summary_i18n = excluded.summary_i18n,
  location_name = excluded.location_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  travel_styles = excluded.travel_styles,
  image_urls = excluded.image_urls,
  payload = excluded.payload,
  featured = excluded.featured,
  status = 'published',
  published_at = coalesce(public.content_items.published_at, excluded.published_at),
  updated_at = now();

commit;
