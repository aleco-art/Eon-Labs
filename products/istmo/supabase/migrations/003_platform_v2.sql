-- Istmo v2: fixes the attachment read policy, moves the recipients directory into the
-- database, persists each author's recipient list, adds server-side feed search and
-- counters, moderation of attachments and per-user limits enforced by the database.

create extension if not exists unaccent with schema extensions;

create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1)) $$;

-- 1. Attachment read policy -------------------------------------------------------------
-- The previous policy compared a.path to a.name (attachments.name shadowed objects.name),
-- so no attachment could ever be read. Attachments can now also be hidden by moderators.
alter table public.attachments add column hidden boolean not null default false;
alter table public.attachments add column created_at timestamptz not null default now();

drop policy if exists proposal_files_read on storage.objects;
create policy proposal_files_read on storage.objects for select using (
  bucket_id = 'proposal-files' and exists (
    select 1 from public.attachments a join public.proposals p on p.id = a.proposal_id
    where a.path = storage.objects.name
      and ((not a.hidden and not p.hidden) or a.owner_id = auth.uid() or public.is_moderator())
  )
);
drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and not p.hidden) and not hidden
  or owner_id = auth.uid() or public.is_moderator()
);

-- 2. Territories: aliases and accent-insensitive search --------------------------------
alter table public.territories add column aliases text[] not null default '{}';
-- array_to_string is not immutable, so the search column is kept by a trigger.
alter table public.territories add column search_text text not null default '';
create function public.territories_search() returns trigger language plpgsql set search_path = public as $$
begin
  new.search_text := f_unaccent(new.name || ' ' || new.district || ' ' || new.province || ' ' || array_to_string(new.aliases, ' '));
  return new;
end $$;
create trigger territories_search before insert or update on public.territories for each row execute function public.territories_search();
update public.territories set aliases = aliases;

-- 3. Proposals: search text, denormalised counters, limits -----------------------------
alter table public.proposals add column updated_at timestamptz not null default now();
alter table public.proposals add column search_text text generated always as (
  public.f_unaccent(title || ' ' || body)
) stored;
alter table public.proposals add column like_count integer not null default 0;
alter table public.proposals add column reshare_count integer not null default 0;
alter table public.proposals add column comment_count integer not null default 0;
alter table public.proposals add column popularity integer generated always as (like_count + 2 * reshare_count + comment_count) stored;
create index proposals_popular on public.proposals (popularity desc, created_at desc) where not hidden;
create index proposals_category on public.proposals (category, created_at desc) where not hidden;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger proposals_touch before update on public.proposals for each row execute function public.touch_updated_at();

-- Counters are derived from the interaction rows, never written by clients.
create function public.sync_counters() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.proposal_id, old.proposal_id);
begin
  update proposals set
    like_count = (select count(*) from likes where proposal_id = pid),
    reshare_count = (select count(*) from reshares where proposal_id = pid),
    comment_count = (select count(*) from comments where proposal_id = pid and not hidden)
  where id = pid;
  return null;
end $$;
create trigger likes_count after insert or delete on public.likes for each row execute function public.sync_counters();
create trigger reshares_count after insert or delete on public.reshares for each row execute function public.sync_counters();
create trigger comments_count after insert or delete or update of hidden on public.comments for each row execute function public.sync_counters();

-- Per-user daily limits enforced in the database, so direct API calls cannot bypass them.
create function public.enforce_daily_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); max_per_day int := tg_argv[1]::int;
begin
  if uid is null then return new; end if; -- service role and seeds
  if not consume_limit(uid, tg_argv[0], max_per_day) then
    raise exception 'Has alcanzado el límite diario para esta acción. Inténtalo mañana.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger limit_proposals before insert on public.proposals for each row execute function public.enforce_daily_limit('proposal', '10');
create trigger limit_comments before insert on public.comments for each row execute function public.enforce_daily_limit('comment', '60');
create trigger limit_likes before insert on public.likes for each row execute function public.enforce_daily_limit('like', '300');
create trigger limit_reshares before insert on public.reshares for each row execute function public.enforce_daily_limit('reshare', '100');
create trigger limit_updates before insert on public.updates for each row execute function public.enforce_daily_limit('update', '20');

-- Author updates distinguish news from responses the author reports having received.
alter table public.updates add column kind text not null default 'actualizacion' check (kind in ('actualizacion', 'respuesta'));
alter table public.updates add column responder text check (char_length(responder) <= 160);
create policy updates_delete on public.updates for delete to authenticated using (author_id = auth.uid());

-- 4. Directory of responsables by area --------------------------------------------------
drop table if exists public.contacts;
create table public.responsables (
  id text primary key,
  name text not null,
  entity_type text not null,
  role_title text,
  person_name text,
  areas text[] not null check (cardinality(areas) > 0),
  level text not null check (level in ('nacional', 'provincial', 'distrital')),
  province_code text,
  district_code text,
  email text check (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  generic_domain boolean not null default false,
  contact_url text,
  phone text,
  competence text not null,
  source_url text not null,
  source_title text,
  source_kind text not null check (source_kind in ('oficial', 'otra_publica')),
  checked_at date not null,
  status text not null default 'activo' check (status in ('activo', 'revisar', 'inactivo')),
  notes text,
  updated_at timestamptz not null default now(),
  check ((level = 'nacional') or (level = 'provincial' and province_code is not null) or (level = 'distrital' and district_code is not null))
);
create index responsables_areas on public.responsables using gin (areas);
create index responsables_place on public.responsables (province_code, district_code);
alter table public.responsables enable row level security;
create policy responsables_read on public.responsables for select using (status <> 'inactivo' or public.is_moderator());

-- 5. Each author's recipient list for a proposal (suggested, web or manual) ------------
create table public.proposal_recipients (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals on delete cascade,
  author_id uuid not null references public.profiles on delete cascade default auth.uid(),
  responsable_id text references public.responsables on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  role_title text check (char_length(role_title) <= 160),
  email text check (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  contact_url text check (contact_url ~* '^https://'),
  reason text check (char_length(reason) <= 600),
  source_url text,
  source_kind text not null check (source_kind in ('oficial', 'otra_publica', 'manual')),
  checked_at date,
  created_at timestamptz not null default now(),
  check (email is not null or contact_url is not null)
);
create unique index proposal_recipients_email on public.proposal_recipients (proposal_id, lower(email)) where email is not null;
alter table public.proposal_recipients enable row level security;
create policy recipients_read on public.proposal_recipients for select to authenticated using (author_id = auth.uid());
create policy recipients_insert on public.proposal_recipients for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.proposals where id = proposal_id and author_id = auth.uid())
);
create policy recipients_delete on public.proposal_recipients for delete to authenticated using (author_id = auth.uid());
create trigger limit_recipients before insert on public.proposal_recipients for each row execute function public.enforce_daily_limit('recipient', '60');

-- 6. Deliveries: link to the recipient and record what was actually sent ---------------
alter table public.deliveries add column recipient_id uuid references public.proposal_recipients on delete set null;
alter table public.deliveries add column recipient_name text;
alter table public.deliveries add column reply_to text;
alter table public.deliveries add column attachment_ids uuid[] not null default '{}';
alter table public.deliveries add column provider text;
alter table public.deliveries add column accepted_at timestamptz;
alter table public.deliveries add column updated_at timestamptz not null default now();
alter table public.deliveries drop constraint deliveries_status_check;
alter table public.deliveries add constraint deliveries_status_check check (status in ('pending', 'accepted', 'delivered', 'bounced', 'failed', 'unknown'));
create index deliveries_proposal on public.deliveries (proposal_id, created_at desc);

-- 7. Reports can target attachments and directory entries; moderation log ----------------
alter table public.reports alter column proposal_id drop not null;
alter table public.reports add column attachment_id uuid references public.attachments on delete cascade;
alter table public.reports add column responsable_id text references public.responsables on delete cascade;
alter table public.reports add column kind text not null default 'contenido' check (kind in ('contenido', 'dato_incorrecto'));
alter table public.reports add constraint reports_target check (
  (proposal_id is not null) or (responsable_id is not null)
);
create trigger limit_reports before insert on public.reports for each row execute function public.enforce_daily_limit('report', '20');

create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles on delete cascade,
  action text not null,
  target_type text not null,
  target_id text not null,
  report_id uuid references public.reports on delete set null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.moderation_log enable row level security;
create policy moderation_log_read on public.moderation_log for select to authenticated using (public.is_moderator());
