-- Creating a quote writes three tables. Doing it from the application would
-- leave an orphan quote behind if the items failed, so it happens here in one
-- statement. It runs as definer because it appends to quote_events, which
-- clients may only read, and therefore checks ownership itself.

create or replace function public.create_quote(
  p_client_id uuid,
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
  v_owner_id uuid := (select auth.uid());
  v_quote_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Se requiere iniciar sesión.' using errcode = '28000';
  end if;

  -- Definer bypasses row level security, so the client is verified here.
  if not exists (
    select 1 from public.clients
     where id = p_client_id and owner_id = v_owner_id
  ) then
    raise exception 'El cliente no existe.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El presupuesto necesita al menos un concepto.' using errcode = '22023';
  end if;

  insert into public.quotes (
    owner_id,
    client_id,
    reference,
    notes,
    subtotal_cents,
    tax_cents,
    total_cents
  )
  values (
    v_owner_id,
    p_client_id,
    p_reference,
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

comment on function public.create_quote(uuid, text, text, bigint, bigint, jsonb) is 'Creates a draft quote with its items in one transaction.';

revoke all on function public.create_quote(uuid, text, text, bigint, bigint, jsonb) from public;
grant execute on function public.create_quote(uuid, text, text, bigint, bigint, jsonb) to authenticated;
