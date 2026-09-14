create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  location text not null default '' check (char_length(location) <= 120),
  avatar_path text,
  created_at timestamptz not null default now()
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Ciudadano'),80));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

create table public.territories (
  code text primary key, name text not null,
  province_code text not null, province text not null,
  district_code text not null, district text not null,
  source_url text not null, checked_at date not null
);
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null check(char_length(title) between 8 and 160),
  body text not null check(char_length(body) between 30 and 12000),
  category text not null check(category in ('Gubernamental','Urbanización','Eventos','Turismo','Cultura','Gastronomía','Medioambiente','Deportes','Emprendimiento','Otras')),
  province text, district text, corregimiento text references territories(code),
  created_at timestamptz not null default now(), shared_at timestamptz,
  hidden boolean not null default false
);
create index proposals_feed on proposals(created_at desc) where not hidden;
create index proposals_location on proposals(province,district,category);
create function public.validate_territory() returns trigger language plpgsql set search_path=public as $$
begin
  if new.province is null and (new.district is not null or new.corregimiento is not null) then raise exception 'Ubicación incompleta'; end if;
  if new.province is not null and not exists(select 1 from territories where province_code=new.province) then raise exception 'Provincia no válida'; end if;
  if new.district is not null and not exists(select 1 from territories where province_code=new.province and district_code=new.district) then raise exception 'Distrito no válido'; end if;
  if new.corregimiento is not null and not exists(select 1 from territories where code=new.corregimiento and district_code=new.district and province_code=new.province) then raise exception 'Corregimiento no válido'; end if;
  return new;
end $$;
create trigger check_territory before insert or update on proposals for each row execute function public.validate_territory();

create table public.likes (
  proposal_id uuid references proposals on delete cascade,
  user_id uuid references profiles on delete cascade default auth.uid(),
  primary key(proposal_id,user_id)
);
create table public.reshares (
  proposal_id uuid references proposals on delete cascade,
  user_id uuid references profiles on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(proposal_id,user_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals on delete cascade,
  author_id uuid not null references profiles on delete cascade default auth.uid(),
  parent_id uuid, body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(), hidden boolean not null default false,
  unique(id,proposal_id),
  foreign key(parent_id,proposal_id) references comments(id,proposal_id) on delete cascade
);
create table public.updates (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals on delete cascade,
  author_id uuid not null references profiles default auth.uid(), body text not null check(char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals on delete cascade,
  owner_id uuid not null references profiles default auth.uid(), path text unique not null, name text not null,
  mime text not null check(mime in ('image/png','image/jpeg','image/webp','application/pdf')),
  size integer not null check(size between 1 and 10485760)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references profiles default auth.uid(),
  proposal_id uuid not null references proposals on delete cascade, comment_id uuid,
  reason text not null check(char_length(reason) between 5 and 1000), created_at timestamptz not null default now(),
  resolved boolean not null default false,
  foreign key(comment_id,proposal_id) references comments(id,proposal_id) on delete cascade
);
create table public.moderators (user_id uuid primary key references profiles on delete cascade);
create function public.is_moderator() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from moderators where user_id=auth.uid())
$$;

create table public.contacts (
  id text primary key, name text not null, kind text not null, categories text[] not null,
  province text, district text, email text, url text not null, source_url text not null,
  checked_at date not null, reason text not null, source_type text not null
);
create table public.research_jobs (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  status text not null default 'queued' check(status in ('queued','running','complete','partial','failed','cancelled')),
  depth text not null check(depth in ('standard','deep')), results jsonb not null default '[]',
  progress integer not null default 0 check(progress between 0 and 100), metrics jsonb not null default '{}',
  error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_research on research_jobs(proposal_id) where status in ('queued','running');
create table public.research_cache (key text primary key, results jsonb not null, expires_at timestamptz not null);
create table public.deliveries (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals on delete cascade,
  user_id uuid not null references profiles on delete cascade, recipient text not null,
  subject text not null, body text not null,
  status text not null default 'pending' check(status in ('pending','accepted','delivered','failed','unknown')),
  provider_id text unique, idempotency_key uuid not null unique, error text,
  created_at timestamptz not null default now(), delivered_at timestamptz
);
create table public.rate_limits (
  user_id uuid not null references profiles on delete cascade, action text not null,
  bucket timestamptz not null, count integer not null, primary key(user_id,action,bucket)
);
create function public.consume_limit(p_user uuid,p_action text,p_limit int) returns boolean language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into rate_limits(user_id,action,bucket,count) values(p_user,p_action,date_trunc('day',now()),1)
  on conflict(user_id,action,bucket) do update set count=rate_limits.count+1 returning count into n;
  return n<=p_limit;
end $$;
revoke all on function public.consume_limit(uuid,text,int) from public,anon,authenticated;
grant execute on function public.consume_limit(uuid,text,int) to service_role;

alter table profiles enable row level security;
create policy profiles_read on profiles for select using(true);
create policy profiles_update on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke update on profiles from authenticated;
grant update(name,bio,location,avatar_path) on profiles to authenticated;

alter table territories enable row level security;
create policy territories_read on territories for select using(true);

alter table proposals enable row level security;
create policy proposals_read on proposals for select using(not hidden or author_id=auth.uid() or is_moderator());
create policy proposals_create on proposals for insert to authenticated with check(author_id=auth.uid() and hidden=false and shared_at is null);
create policy proposals_update on proposals for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy proposals_delete on proposals for delete to authenticated using(author_id=auth.uid());
revoke update on proposals from authenticated;
grant update(title,body,category,province,district,corregimiento) on proposals to authenticated;

alter table likes enable row level security;
create policy likes_read on likes for select using(exists(select 1 from proposals where id=proposal_id and not hidden));
create policy likes_insert on likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from proposals where id=proposal_id and not hidden));
create policy likes_delete on likes for delete to authenticated using(user_id=auth.uid());
alter table reshares enable row level security;
create policy reshares_read on reshares for select using(exists(select 1 from proposals where id=proposal_id and not hidden));
create policy reshares_insert on reshares for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from proposals where id=proposal_id and not hidden));
create policy reshares_delete on reshares for delete to authenticated using(user_id=auth.uid());

alter table comments enable row level security;
create policy comments_read on comments for select using((not hidden or author_id=auth.uid() or is_moderator()) and exists(select 1 from proposals where id=proposal_id));
create policy comments_insert on comments for insert to authenticated with check(author_id=auth.uid() and not hidden and exists(select 1 from proposals where id=proposal_id and not hidden));
create policy comments_update on comments for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy comments_delete on comments for delete to authenticated using(author_id=auth.uid());
revoke update on comments from authenticated;
grant update(body) on comments to authenticated;

alter table updates enable row level security;
create policy updates_read on updates for select using(exists(select 1 from proposals where id=proposal_id and not hidden));
create policy updates_insert on updates for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from proposals where id=proposal_id and author_id=auth.uid() and not hidden));

alter table attachments enable row level security;
create policy attachments_read on attachments for select using(exists(select 1 from proposals where id=proposal_id and not hidden));
create policy attachments_insert on attachments for insert to authenticated with check(owner_id=auth.uid() and path like auth.uid()::text||'/'||proposal_id::text||'/%' and exists(select 1 from proposals where id=proposal_id and author_id=auth.uid()));
create policy attachments_delete on attachments for delete to authenticated using(owner_id=auth.uid());

alter table reports enable row level security;
create policy reports_insert on reports for insert to authenticated with check(reporter_id=auth.uid() and not resolved);
create policy reports_read on reports for select to authenticated using(reporter_id=auth.uid() or is_moderator());
alter table moderators enable row level security;
create policy moderators_self on moderators for select to authenticated using(user_id=auth.uid());
alter table contacts enable row level security;
create policy contacts_read on contacts for select using(true);
alter table research_jobs enable row level security;
create policy jobs_read on research_jobs for select to authenticated using(user_id=auth.uid());
alter table research_cache enable row level security;
alter table deliveries enable row level security;
create policy deliveries_read on deliveries for select to authenticated using(user_id=auth.uid());
alter table rate_limits enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('proposal-files','proposal-files',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf']),
  ('avatars','avatars',true,2097152,array['image/png','image/jpeg','image/webp']);
create policy proposal_files_read on storage.objects for select using(bucket_id='proposal-files' and exists(select 1 from public.attachments a join public.proposals p on p.id=a.proposal_id where a.path=name and not p.hidden));
create policy proposal_files_insert on storage.objects for insert to authenticated with check(bucket_id='proposal-files' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.proposals where id::text=(storage.foldername(name))[2] and author_id=auth.uid()));
create policy proposal_files_delete on storage.objects for delete to authenticated using(bucket_id='proposal-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_read on storage.objects for select using(bucket_id='avatars');
create policy avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
