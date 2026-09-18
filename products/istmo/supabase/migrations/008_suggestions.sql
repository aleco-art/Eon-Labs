-- Users can suggest a responsable the directory is missing. Nothing reaches the public
-- directory until a moderator checks the source and accepts it.

create table public.responsable_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references public.profiles on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 3 and 160),
  entity_type text not null check (char_length(entity_type) between 3 and 80),
  role_title text check (char_length(role_title) <= 160),
  person_name text check (char_length(person_name) <= 120),
  email text check (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' and char_length(email) <= 254),
  contact_url text check (contact_url ~* '^https?://[^\s]+$' and char_length(contact_url) <= 300),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  areas text[] not null check (cardinality(areas) between 1 and 10),
  level text not null check (level in ('nacional', 'provincial', 'distrital')),
  province_code text,
  district_code text,
  competence text not null check (char_length(competence) between 10 and 500),
  source_url text not null check (source_url ~* '^https?://[^\s]+$' and char_length(source_url) <= 300),
  note text check (char_length(note) <= 500),
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada')),
  review_note text check (char_length(review_note) <= 500),
  responsable_id text references public.responsables on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  -- A responsable nobody can reach is no use: an email or a contact page is required.
  constraint suggestions_reachable check (email is not null or contact_url is not null),
  constraint suggestions_place check (
    (level = 'nacional')
    or (level = 'provincial' and province_code is not null)
    or (level = 'distrital' and district_code is not null)
  )
);
create index suggestions_pending on public.responsable_suggestions (created_at) where status = 'pendiente';
create index suggestions_by_user on public.responsable_suggestions (suggested_by, created_at desc);
alter table public.responsable_suggestions enable row level security;

-- You see your own suggestions and how they went; moderators see all of them.
create policy suggestions_read on public.responsable_suggestions for select to authenticated
  using (suggested_by = auth.uid() or public.is_moderator());
create policy suggestions_insert on public.responsable_suggestions for insert to authenticated
  with check (suggested_by = auth.uid());
revoke insert, update, delete on public.responsable_suggestions from anon, authenticated;
-- Status, review and the published entry are set by moderation on the server, never by the client.
grant insert (suggested_by, name, entity_type, role_title, person_name, email, contact_url, phone, areas, level,
  province_code, district_code, competence, source_url, note) on public.responsable_suggestions to authenticated;
create trigger limit_suggestions before insert on public.responsable_suggestions
  for each row execute function public.enforce_daily_limit('suggestion', '10');
