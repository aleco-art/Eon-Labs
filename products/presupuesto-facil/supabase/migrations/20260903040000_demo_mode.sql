-- Demo mode.
--
-- The pilot needs the whole loop working without waiting on email delivery, so
-- ownership moves from a Supabase Auth user to the email typed at the door.
--
-- The tables stay closed to anon exactly as before. Every operation goes
-- through a security definer function that takes the owner email and scopes the
-- work to it, which is the same shape already used for the public link. No
-- service_role key is involved, so nothing privileged reaches the browser.

alter table public.clients alter column owner_id drop not null;
alter table public.quotes alter column owner_id drop not null;

alter table public.clients add column owner_email text;
alter table public.quotes add column owner_email text;

alter table public.clients
  add constraint clients_owner_email_length check (char_length(owner_email) <= 254);

alter table public.quotes
  add constraint quotes_owner_email_length check (char_length(owner_email) <= 254);

-- References were unique per auth user; ownership is now the email.
alter table public.quotes drop constraint quotes_reference_unique_per_owner;

create unique index quotes_reference_per_owner_email_idx
  on public.quotes (owner_email, reference)
  where owner_email is not null;

create index clients_owner_email_idx on public.clients (owner_email);
create index quotes_owner_email_idx on public.quotes (owner_email);

create or replace function public.normalise_owner_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(lower(btrim(p_email)), '');
$$;

revoke all on function public.normalise_owner_email(text) from public, anon;

-- Clients -------------------------------------------------------------------

create or replace function public.demo_list_clients(p_owner_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text := public.normalise_owner_email(p_owner_email);
begin
  if v_owner is null then
    raise exception 'Falta el correo del profesional.' using errcode = '22023';
  end if;

  return coalesce(
    (
      select jsonb_agg(
               jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email)
               order by c.name
             )
        from public.clients c
       where c.owner_email = v_owner
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.demo_list_clients(text) from public;
grant execute on function public.demo_list_clients(text) to anon, authenticated;

-- Quotes --------------------------------------------------------------------

create or replace function public.demo_create_quote(
  p_owner_email text,
  p_client_name text,
  p_client_email text,
  p_reference text,
  p_notes text,
  p_subtotal_cents bigint,
  p_tax_cents bigint,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text := public.normalise_owner_email(p_owner_email);
  v_client_id uuid;
  v_quote_id uuid;
begin
  if v_owner is null then
    raise exception 'Falta el correo del profesional.' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_client_name, ''))) = 0 then
    raise exception 'El cliente necesita un nombre.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El presupuesto necesita al menos un concepto.' using errcode = '22023';
  end if;

  -- One client per name for this owner keeps the demo from piling up
  -- duplicates every time the same customer is quoted again.
  select id into v_client_id
    from public.clients
   where owner_email = v_owner and lower(name) = lower(btrim(p_client_name))
   limit 1;

  if v_client_id is null then
    insert into public.clients (owner_email, name, email)
    values (v_owner, btrim(p_client_name), public.normalise_owner_email(p_client_email))
    returning id into v_client_id;
  end if;

  insert into public.quotes (
    owner_email,
    client_id,
    reference,
    notes,
    subtotal_cents,
    tax_cents,
    total_cents
  )
  values (
    v_owner,
    v_client_id,
    btrim(p_reference),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_subtotal_cents,
    p_tax_cents,
    p_subtotal_cents + p_tax_cents
  )
  returning id into v_quote_id;

  insert into public.quote_items (
    quote_id,
    sort_order,
    description,
    quantity,
    unit_price_cents,
    tax_rate,
    line_total_cents
  )
  select
    v_quote_id,
    (item.ordinality - 1)::integer,
    item.value ->> 'description',
    (item.value ->> 'quantity')::numeric,
    (item.value ->> 'unitPriceCents')::bigint,
    (item.value ->> 'taxRate')::numeric,
    (item.value ->> 'lineTotalCents')::bigint
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);

  insert into public.quote_events (quote_id, event_type)
  values (v_quote_id, 'created');

  return v_quote_id;
end;
$$;

revoke all on function public.demo_create_quote(text, text, text, text, text, bigint, bigint, jsonb) from public;
grant execute on function public.demo_create_quote(text, text, text, text, text, bigint, bigint, jsonb) to anon, authenticated;

create or replace function public.demo_list_quotes(p_owner_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text := public.normalise_owner_email(p_owner_email);
begin
  if v_owner is null then
    raise exception 'Falta el correo del profesional.' using errcode = '22023';
  end if;

  return coalesce(
    (
      select jsonb_agg(
               jsonb_build_object(
                 'id', q.id,
                 'reference', q.reference,
                 'status', q.status,
                 'totalCents', q.total_cents,
                 'clientName', c.name,
                 'updatedAt', q.updated_at,
                 'respondedAt', q.responded_at,
                 'responseComment', q.response_comment,
                 'isShared', q.token_hash is not null
               )
               order by q.created_at desc
             )
        from public.quotes q
        join public.clients c on c.id = q.client_id
       where q.owner_email = v_owner
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.demo_list_quotes(text) from public;
grant execute on function public.demo_list_quotes(text) to anon, authenticated;

create or replace function public.demo_get_quote(p_owner_email text, p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text := public.normalise_owner_email(p_owner_email);
  v_quote public.quotes;
  v_client_name text;
begin
  if v_owner is null then
    raise exception 'Falta el correo del profesional.' using errcode = '22023';
  end if;

  select * into v_quote
    from public.quotes
   where id = p_quote_id and owner_email = v_owner;

  if not found then
    return null;
  end if;

  select name into v_client_name from public.clients where id = v_quote.client_id;

  return jsonb_build_object(
    'id', v_quote.id,
    'reference', v_quote.reference,
    'status', v_quote.status,
    'clientName', v_client_name,
    'notes', v_quote.notes,
    'subtotalCents', v_quote.subtotal_cents,
    'taxCents', v_quote.tax_cents,
    'totalCents', v_quote.total_cents,
    'isShared', v_quote.token_hash is not null,
    'expiresAt', v_quote.token_expires_at,
    'sharedAt', v_quote.shared_at,
    'viewedAt', v_quote.viewed_at,
    'respondedAt', v_quote.responded_at,
    'responseComment', v_quote.response_comment,
    'items', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'description', i.description,
                   'quantity', i.quantity,
                   'unitPriceCents', i.unit_price_cents,
                   'taxRate', i.tax_rate,
                   'lineTotalCents', i.line_total_cents
                 )
                 order by i.sort_order
               )
          from public.quote_items i
         where i.quote_id = v_quote.id
      ),
      '[]'::jsonb
    ),
    'events', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('type', e.event_type, 'occurredAt', e.occurred_at)
                 order by e.occurred_at
               )
          from public.quote_events e
         where e.quote_id = v_quote.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.demo_get_quote(text, uuid) from public;
grant execute on function public.demo_get_quote(text, uuid) to anon, authenticated;

-- Sharing. The token itself is never stored, so a quote that has not been
-- answered can be shared again to obtain a fresh link.

create or replace function public.demo_share_quote(
  p_owner_email text,
  p_quote_id uuid,
  p_token text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text := public.normalise_owner_email(p_owner_email);
  v_status public.quote_status;
begin
  if v_owner is null then
    raise exception 'Falta el correo del profesional.' using errcode = '22023';
  end if;

  if char_length(p_token) < 32 then
    raise exception 'El token público es demasiado corto.' using errcode = '22023';
  end if;

  if p_expires_at <= now() then
    raise exception 'La caducidad debe ser futura.' using errcode = '22023';
  end if;

  update public.quotes
     set status = 'shared',
         token_hash = public.hash_quote_token(p_token),
         token_expires_at = p_expires_at,
         shared_at = coalesce(shared_at, now())
   where id = p_quote_id
     and owner_email = v_owner
     and status in ('draft', 'shared', 'viewed')
  returning status into v_status;

  if v_status is null then
    raise exception 'El presupuesto no existe o ya fue respondido.' using errcode = 'P0002';
  end if;

  insert into public.quote_events (quote_id, event_type)
  values (p_quote_id, 'shared');

  return jsonb_build_object('status', v_status);
end;
$$;

revoke all on function public.demo_share_quote(text, uuid, text, timestamptz) from public;
grant execute on function public.demo_share_quote(text, uuid, text, timestamptz) to anon, authenticated;

-- The customer's view showed the business name from the auth profile, which no
-- longer exists in demo mode. Fall back to the owner email so the quote still
-- says who sent it.

create or replace function public.get_shared_quote(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_business_name text;
  v_client_name text;
  v_items jsonb;
begin
  select * into v_quote
    from public.quotes
   where token_hash = public.hash_quote_token(p_token);

  if not found then
    return null;
  end if;

  if v_quote.token_expires_at <= now() then
    return null;
  end if;

  if v_quote.status not in ('shared', 'viewed', 'accepted', 'rejected') then
    return null;
  end if;

  if v_quote.status = 'shared' then
    update public.quotes
       set status = 'viewed',
           viewed_at = coalesce(viewed_at, now())
     where id = v_quote.id
    returning * into v_quote;

    insert into public.quote_events (quote_id, event_type)
    values (v_quote.id, 'viewed');
  end if;

  select business_name into v_business_name
    from public.profiles
   where id = v_quote.owner_id;

  v_business_name := coalesce(v_business_name, v_quote.owner_email);

  select name into v_client_name
    from public.clients
   where id = v_quote.client_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'description', i.description,
               'quantity', i.quantity,
               'unitPriceCents', i.unit_price_cents,
               'taxRate', i.tax_rate,
               'lineTotalCents', i.line_total_cents
             )
             order by i.sort_order
           ),
           '[]'::jsonb
         )
    into v_items
    from public.quote_items i
   where i.quote_id = v_quote.id;

  return jsonb_build_object(
    'reference', v_quote.reference,
    'status', v_quote.status,
    'currency', v_quote.currency,
    'businessName', v_business_name,
    'clientName', v_client_name,
    'notes', v_quote.notes,
    'subtotalCents', v_quote.subtotal_cents,
    'taxCents', v_quote.tax_cents,
    'totalCents', v_quote.total_cents,
    'expiresAt', v_quote.token_expires_at,
    'respondedAt', v_quote.responded_at,
    'responseComment', v_quote.response_comment,
    'items', v_items
  );
end;
$$;

revoke all on function public.get_shared_quote(text) from public;
grant execute on function public.get_shared_quote(text) to anon, authenticated;
