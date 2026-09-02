-- Public quote access.
--
-- Anonymous visitors never query the tables. They call these functions with the
-- token from their link; the function hashes it and compares against the stored
-- SHA-256. Only sanitised fields are returned: no owner, no token hash, no
-- internal notes. Hashing lives here so the application never reimplements it.

create or replace function public.hash_quote_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(p_token, 'UTF8'));
$$;

comment on function public.hash_quote_token(text) is 'SHA-256 of a public token. Single source of truth for token hashing.';

revoke all on function public.hash_quote_token(text) from public;
grant execute on function public.hash_quote_token(text) to authenticated;

-- Sharing runs as the caller so row level security still applies: an owner can
-- only ever share a quote they own.

create or replace function public.share_quote(
  p_quote_id uuid,
  p_token text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.quote_status;
begin
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
     and status = 'draft'
  returning status into v_status;

  if v_status is null then
    raise exception 'El presupuesto no existe o no es un borrador.' using errcode = 'P0002';
  end if;

  insert into public.quote_events (quote_id, event_type)
  values (p_quote_id, 'shared');

  return jsonb_build_object('status', v_status);
end;
$$;

revoke all on function public.share_quote(uuid, text, timestamptz) from public;
grant execute on function public.share_quote(uuid, text, timestamptz) to authenticated;

-- Reading a shared quote also records the first view, so the owner sees a
-- reliable state without a second round trip.

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

comment on function public.get_shared_quote(text) is 'Sanitised view of a shared quote for an anonymous visitor.';

revoke all on function public.get_shared_quote(text) from public;
grant execute on function public.get_shared_quote(text) to anon, authenticated;

create or replace function public.respond_to_quote(
  p_token text,
  p_decision text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_status public.quote_status;
begin
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'La respuesta no es válida.' using errcode = '22023';
  end if;

  if char_length(coalesce(p_comment, '')) > 1000 then
    raise exception 'El comentario es demasiado largo.' using errcode = '22023';
  end if;

  select * into v_quote
    from public.quotes
   where token_hash = public.hash_quote_token(p_token);

  if not found then
    raise exception 'El enlace no es válido.' using errcode = 'P0002';
  end if;

  if v_quote.token_expires_at <= now() then
    raise exception 'El enlace ha caducado.' using errcode = 'P0002';
  end if;

  if v_quote.status not in ('shared', 'viewed') then
    raise exception 'Este presupuesto ya no admite respuesta.' using errcode = '22023';
  end if;

  v_status := p_decision::public.quote_status;

  update public.quotes
     set status = v_status,
         responded_at = now(),
         response_comment = nullif(btrim(coalesce(p_comment, '')), '')
   where id = v_quote.id;

  insert into public.quote_events (quote_id, event_type)
  values (v_quote.id, p_decision);

  return jsonb_build_object('status', v_status);
end;
$$;

comment on function public.respond_to_quote(text, text, text) is 'Records an acceptance or a rejection from the public link.';

revoke all on function public.respond_to_quote(text, text, text) from public;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;
