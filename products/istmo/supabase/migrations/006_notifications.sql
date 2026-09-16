-- Notifications: the author finds out that their proposal is moving, in the platform and
-- in one daily email. Rows are written by triggers, never by clients.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  proposal_id uuid references public.proposals on delete cascade,
  kind text not null check (kind in ('apoyo', 'firma', 'comentario', 'republicacion', 'meta_firmas')),
  actor_id uuid references public.profiles on delete set null,
  -- Copy of the name at the time: an anonymous signature leaves both actor columns empty.
  actor_name text check (char_length(actor_name) <= 80),
  comment_id uuid references public.comments on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  emailed_at timestamptz
);
create index notifications_inbox on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
create index notifications_to_email on public.notifications (user_id) where emailed_at is null;
alter table public.notifications enable row level security;
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.notifications from anon, authenticated;
-- Marking as read is the only change a client may make.
grant update (read_at) on public.notifications to authenticated;

-- Email settings live apart from profiles, which are public: nobody else needs to know
-- whether you get emails, and the unsubscribe token must never leave the server.
create table public.email_settings (
  user_id uuid primary key references public.profiles on delete cascade,
  digest boolean not null default true,
  token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);
alter table public.email_settings enable row level security;
create policy email_settings_read on public.email_settings for select to authenticated using (user_id = auth.uid());
create policy email_settings_write on public.email_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke select, insert, update, delete on public.email_settings from anon, authenticated;
grant select (user_id, digest, updated_at) on public.email_settings to authenticated;
grant update (digest) on public.email_settings to authenticated;

-- One notification per interaction, except your own: nobody needs to be told they liked
-- their own proposal.
create or replace function public.notify_author() returns trigger language plpgsql
security definer set search_path = public as $$
declare
  author uuid;
  actor uuid;
  label text;
  k text;
  cid uuid;
begin
  select author_id into author from proposals where id = new.proposal_id and not hidden;
  if author is null then return null; end if;
  -- Each branch only touches columns that exist on its own table.
  if tg_table_name = 'comments' then
    actor := new.author_id;
    cid := new.id;
  else
    actor := new.user_id;
  end if;
  if actor = author then return null; end if;
  k := case tg_table_name
    when 'likes' then 'apoyo'
    when 'signatures' then 'firma'
    when 'comments' then 'comentario'
    when 'reshares' then 'republicacion'
  end;
  -- `new.public_name` only exists on signatures, so it is read inside its own branch.
  if tg_table_name = 'signatures' then
    if not new.public_name then actor := null; end if;
  end if;
  if actor is not null then
    select name into label from profiles where id = actor;
  end if;
  insert into notifications (user_id, proposal_id, kind, actor_id, actor_name, comment_id)
  values (author, new.proposal_id, k, actor, label, cid);
  return null;
end $$;

create trigger likes_notify after insert on public.likes for each row execute function public.notify_author();
create trigger signatures_notify after insert on public.signatures for each row execute function public.notify_author();
create trigger reshares_notify after insert on public.reshares for each row execute function public.notify_author();
create trigger comments_notify after insert on public.comments for each row execute function public.notify_author();

-- Reaching the signature goal is worth its own notice, and only the first time.
create or replace function public.notify_signature_goal() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if new.signature_goal is not null
     and new.signature_count >= new.signature_goal
     and old.signature_count < new.signature_goal then
    insert into notifications (user_id, proposal_id, kind)
    values (new.author_id, new.id, 'meta_firmas');
  end if;
  return null;
end $$;
create trigger proposals_goal_notify after update of signature_count on public.proposals
  for each row execute function public.notify_signature_goal();

-- Everything the daily digest needs, in one call the service role makes. Account emails
-- live in auth.users, which clients cannot read, so this stays away from them.
-- The output columns are named apart from the table columns they read: inside plpgsql a
-- matching name would make `user_id` ambiguous.
create or replace function public.digest_queue() returns table (
  author_id uuid, author_email text, author_name text, unsubscribe_token uuid, items jsonb
) language plpgsql security definer set search_path = public, auth as $$
begin
  insert into email_settings (user_id)
  select distinct n.user_id from notifications n where n.emailed_at is null
  on conflict (user_id) do nothing;

  return query
  select p.id, u.email::text, p.name, s.token,
    jsonb_agg(jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'actor', n.actor_name,
      'proposal_id', n.proposal_id, 'title', pr.title, 'created_at', n.created_at
    ) order by n.created_at)
  from notifications n
  join profiles p on p.id = n.user_id
  join auth.users u on u.id = n.user_id
  join email_settings s on s.user_id = n.user_id
  left join proposals pr on pr.id = n.proposal_id
  where n.emailed_at is null and s.digest and u.email is not null
  group by p.id, u.email, p.name, s.token;
end $$;
revoke all on function public.digest_queue() from public, anon, authenticated;

-- Unsubscribing happens from a link in the email, with no session: the token is the proof.
create or replace function public.stop_digest(p_token uuid) returns boolean language plpgsql
security definer set search_path = public as $$
declare hit uuid;
begin
  update email_settings set digest = false, updated_at = now() where token = p_token returning user_id into hit;
  return hit is not null;
end $$;
revoke all on function public.stop_digest(uuid) from public, anon, authenticated;
