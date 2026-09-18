-- Direct messages between Istmo users. Every rule that protects people (blocks, the
-- "who can write to me" setting, daily limits) lives in send_message, not in the client,
-- so there is one door and it is guarded.

-- 1. Settings: the table now holds more than email ------------------------------------
alter table public.email_settings rename to user_settings;
alter table public.user_settings add column messages_from text not null default 'todos'
  check (messages_from in ('todos', 'nadie'));
grant select (user_id, digest, messages_from, updated_at) on public.user_settings to authenticated;
grant update (digest, messages_from) on public.user_settings to authenticated;

-- 2. Conversations and messages --------------------------------------------------------
-- One row per pair, with the ids in a fixed order so a pair can never have two threads.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_ordered check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_for_a on public.conversations (user_a, last_message_at desc);
create index conversations_for_b on public.conversations (user_b, last_message_at desc);
alter table public.conversations enable row level security;
create policy conversations_read on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));
revoke insert, update, delete on public.conversations from anon, authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  hidden boolean not null default false
);
create index messages_thread on public.messages (conversation_id, created_at);
create index messages_unread on public.messages (conversation_id) where read_at is null;
alter table public.messages enable row level security;
-- Only the two people in the thread, and a hidden message disappears for the one who received it.
create policy messages_read on public.messages for select to authenticated using (
  (not hidden or sender_id = auth.uid())
  and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);
create policy messages_mark on public.messages for update to authenticated using (
  sender_id <> auth.uid()
  and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
) with check (
  sender_id <> auth.uid()
  and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);
revoke insert, update, delete on public.messages from anon, authenticated;
-- Marking what you received as read is the only change a client may make.
grant update (read_at) on public.messages to authenticated;

-- 3. Blocking --------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade default auth.uid(),
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
-- You can see, add and undo your own blocks; nobody can see who blocked them.
create policy blocks_read on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_add on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_remove on public.blocks for delete to authenticated using (blocker_id = auth.uid());
revoke update on public.blocks from anon, authenticated;

-- 4. Notifications learn about messages -------------------------------------------------
alter table public.notifications add column conversation_id uuid references public.conversations on delete cascade;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('apoyo', 'firma', 'comentario', 'republicacion', 'meta_firmas', 'mensaje'));

-- 5. Sending: the single guarded door ---------------------------------------------------
create or replace function public.send_message(p_to uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  convo uuid;
  my_name text;
  body text := btrim(p_body);
begin
  if me is null then raise exception 'Inicia sesion para escribir.' using errcode = 'P0001'; end if;
  if p_to = me then raise exception 'No puedes escribirte a ti mismo.' using errcode = 'P0001'; end if;
  if char_length(body) < 1 or char_length(body) > 4000 then
    raise exception 'El mensaje debe tener entre 1 y 4000 caracteres.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from profiles where id = p_to) then
    raise exception 'Esa persona ya no esta en la plataforma.' using errcode = 'P0001';
  end if;
  -- A block works both ways: neither of them can start or continue the thread.
  if exists (select 1 from blocks where (blocker_id = p_to and blocked_id = me) or (blocker_id = me and blocked_id = p_to)) then
    raise exception 'No puedes escribir a esta persona.' using errcode = 'P0001';
  end if;
  if exists (select 1 from user_settings s where s.user_id = p_to and s.messages_from = 'nadie') then
    raise exception 'Esta persona no acepta mensajes en la plataforma.' using errcode = 'P0001';
  end if;
  if not consume_limit(me, 'message', 50) then
    raise exception 'Has alcanzado el limite de mensajes de hoy. Puedes continuar manana.' using errcode = 'P0001';
  end if;

  if me < p_to then a := me; b := p_to; else a := p_to; b := me; end if;
  insert into conversations (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do update set last_message_at = now()
  returning id into convo;

  insert into messages (conversation_id, sender_id, body) values (convo, me, body);
  select name into my_name from profiles where id = me;
  insert into notifications (user_id, kind, actor_id, actor_name, conversation_id)
  values (p_to, 'mensaje', me, my_name, convo);
  return convo;
end $$;
revoke all on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;

-- 6. Reporting a message ----------------------------------------------------------------
-- The reported text is copied into the report, so moderators read that one message and
-- never get access to anybody's private thread.
alter table public.reports add column message_id uuid references public.messages on delete cascade;
alter table public.reports add column snapshot text;
alter table public.reports drop constraint reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('contenido', 'dato_incorrecto', 'mensaje'));
alter table public.reports drop constraint reports_target;
alter table public.reports add constraint reports_target check (
  (proposal_id is not null) or (responsable_id is not null) or (message_id is not null)
);

create or replace function public.report_message(p_message uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m record;
begin
  if me is null then raise exception 'Inicia sesion para reportar.' using errcode = 'P0001'; end if;
  select msg.id as id, msg.body as body into m
  from messages msg
  join conversations c on c.id = msg.conversation_id
  where msg.id = p_message and me in (c.user_a, c.user_b) and msg.sender_id <> me;
  if m.id is null then raise exception 'Solo puedes reportar un mensaje que recibiste.' using errcode = 'P0001'; end if;
  if char_length(btrim(p_reason)) < 5 then raise exception 'Explica brevemente el motivo.' using errcode = 'P0001'; end if;
  insert into reports (reporter_id, kind, message_id, reason, snapshot)
  values (me, 'mensaje', m.id, btrim(p_reason), m.body);
end $$;
revoke all on function public.report_message(uuid, text) from public, anon;
grant execute on function public.report_message(uuid, text) to authenticated;

-- 7. The settings table was renamed, so both functions that read it are rebuilt ----------
create or replace function public.digest_queue() returns table (
  author_id uuid, author_email text, author_name text, unsubscribe_token uuid, items jsonb
) language plpgsql security definer set search_path = public, auth as $$
begin
  insert into user_settings (user_id)
  select distinct n.user_id from notifications n where n.emailed_at is null
  on conflict (user_id) do nothing;

  return query
  select p.id, u.email::text, p.name, s.token,
    jsonb_agg(jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'actor', n.actor_name,
      'proposal_id', n.proposal_id, 'conversation_id', n.conversation_id,
      'title', pr.title, 'created_at', n.created_at
    ) order by n.created_at)
  from notifications n
  join profiles p on p.id = n.user_id
  join auth.users u on u.id = n.user_id
  join user_settings s on s.user_id = n.user_id
  left join proposals pr on pr.id = n.proposal_id
  where n.emailed_at is null and s.digest and u.email is not null
  group by p.id, u.email, p.name, s.token;
end $$;
revoke all on function public.digest_queue() from public, anon, authenticated;

create or replace function public.stop_digest(p_token uuid) returns boolean language plpgsql
security definer set search_path = public as $$
declare hit uuid;
begin
  update user_settings set digest = false, updated_at = now() where token = p_token returning user_id into hit;
  return hit is not null;
end $$;
revoke all on function public.stop_digest(uuid) from public, anon, authenticated;

-- 8. The inbox in one call: the other person, the last line and what is unread ----------
create or replace function public.my_conversations() returns table (
  conversation_id uuid, other_id uuid, other_name text, other_avatar text,
  last_body text, last_at timestamptz, last_mine boolean, unread integer
) language sql stable security definer set search_path = public as $$
  select c.id, p.id, p.name, p.avatar_path,
    m.body, m.created_at, m.sender_id = auth.uid(),
    (select count(*) from messages x
      where x.conversation_id = c.id and x.sender_id <> auth.uid() and x.read_at is null and not x.hidden)::int
  from conversations c
  join profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (
    select m2.body, m2.created_at, m2.sender_id from messages m2
    where m2.conversation_id = c.id and (not m2.hidden or m2.sender_id = auth.uid())
    order by m2.created_at desc limit 1
  ) m on true
  where auth.uid() in (c.user_a, c.user_b)
  order by c.last_message_at desc
  limit 100
$$;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
