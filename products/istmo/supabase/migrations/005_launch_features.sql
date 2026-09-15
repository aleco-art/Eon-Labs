-- Istmo launch: optional public contact details on profiles, signature collection on
-- proposals, photos kept apart from supporting documents, and insert grants that stop
-- clients from forging counters.

-- 1. Profiles: optional public contact details -----------------------------------------
-- Everything here is public once filled in; the account email stays private.
alter table public.profiles add column occupation text check (char_length(occupation) <= 80);
alter table public.profiles add column contact_email text check (contact_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' and char_length(contact_email) <= 254);
alter table public.profiles add column phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$');
alter table public.profiles add column website text check (website ~* '^https?://[^\s]+$' and char_length(website) <= 200);
alter table public.profiles add column instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$');
alter table public.profiles add column linkedin text check (linkedin ~* '^https://([a-z]{2,3}\.)?linkedin\.com/[^\s]+$' and char_length(linkedin) <= 200);
grant update (occupation, contact_email, phone, website, instagram, linkedin) on public.profiles to authenticated;

-- 2. Proposals: signature collection and insert grants ---------------------------------
alter table public.proposals add column signatures_enabled boolean not null default false;
alter table public.proposals add column signature_goal integer check (signature_goal between 10 and 1000000);
alter table public.proposals add column signature_count integer not null default 0;

-- Clients may only insert the fields they author; counters, hidden and shared_at keep
-- their defaults (previously an insert could set like_count directly).
revoke insert on public.proposals from authenticated;
grant insert (author_id, title, body, category, province, district, corregimiento, signatures_enabled, signature_goal) on public.proposals to authenticated;
grant update (signatures_enabled, signature_goal) on public.proposals to authenticated;

create table public.signatures (
  proposal_id uuid not null references public.proposals on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  signer_name text not null check (char_length(signer_name) between 2 and 120),
  public_name boolean not null default true,
  reason text check (char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);
create index signatures_recent on public.signatures (proposal_id, created_at desc);
alter table public.signatures enable row level security;
-- Anonymous signatures count, but only their signer can read the row.
create policy signatures_read on public.signatures for select using (
  (public_name or user_id = auth.uid() or public.is_moderator())
  and exists (select 1 from public.proposals p where p.id = proposal_id and not p.hidden)
);
create policy signatures_insert on public.signatures for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.proposals p where p.id = proposal_id and not p.hidden and p.signatures_enabled)
);
create policy signatures_delete on public.signatures for delete to authenticated using (user_id = auth.uid());
revoke update on public.signatures from authenticated;
create trigger limit_signatures before insert on public.signatures for each row execute function public.enforce_daily_limit('signature', '300');

create or replace function public.sync_counters() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.proposal_id, old.proposal_id);
begin
  update proposals set
    like_count = (select count(*) from likes where proposal_id = pid),
    reshare_count = (select count(*) from reshares where proposal_id = pid),
    comment_count = (select count(*) from comments where proposal_id = pid and not hidden),
    signature_count = (select count(*) from signatures where proposal_id = pid)
  where id = pid;
  return null;
end $$;
create trigger signatures_count after insert or delete on public.signatures for each row execute function public.sync_counters();

-- Signatures weigh in popularity like reshares.
drop index if exists public.proposals_popular;
alter table public.proposals drop column popularity;
alter table public.proposals add column popularity integer generated always as (like_count + 2 * reshare_count + comment_count + 2 * signature_count) stored;
create index proposals_popular on public.proposals (popularity desc, created_at desc) where not hidden;

-- 3. Attachments: photos of the proposal vs supporting documents -----------------------
alter table public.attachments add column kind text not null default 'documento' check (kind in ('foto', 'documento'));
alter table public.attachments add constraint attachments_photo_is_image check (kind = 'documento' or mime in ('image/png', 'image/jpeg', 'image/webp'));
create index attachments_photos on public.attachments (proposal_id, created_at) where kind = 'foto' and not hidden;
