-- Core loop: clients, quotes, quote items and a minimal event history.
-- Money is stored as integer cents; tax rates keep explicit decimal precision.

create type public.quote_status as enum (
  'draft',
  'shared',
  'viewed',
  'accepted',
  'rejected',
  'expired'
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  tax_id text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (char_length(name) between 1 and 160),
  constraint clients_email_length check (char_length(email) <= 254),
  constraint clients_phone_length check (char_length(phone) <= 40),
  constraint clients_tax_id_length check (char_length(tax_id) <= 20),
  constraint clients_address_length check (char_length(address) <= 400)
);

comment on table public.clients is 'Customers of an internal user. Customers never authenticate.';

create index clients_owner_id_idx on public.clients (owner_id);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  reference text not null,
  status public.quote_status not null default 'draft',
  currency text not null default 'EUR',
  notes text,
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  token_hash bytea,
  token_expires_at timestamptz,
  shared_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  response_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_reference_length check (char_length(reference) between 1 and 40),
  constraint quotes_reference_unique_per_owner unique (owner_id, reference),
  constraint quotes_currency_supported check (currency = 'EUR'),
  constraint quotes_notes_length check (char_length(notes) <= 2000),
  constraint quotes_response_comment_length check (char_length(response_comment) <= 1000),
  constraint quotes_amounts_non_negative check (
    subtotal_cents >= 0 and tax_cents >= 0 and total_cents >= 0
  ),
  constraint quotes_total_is_consistent check (total_cents = subtotal_cents + tax_cents),
  constraint quotes_token_hash_length check (octet_length(token_hash) = 32),
  constraint quotes_token_is_complete check (
    (token_hash is null and token_expires_at is null)
    or (token_hash is not null and token_expires_at is not null)
  ),
  constraint quotes_draft_has_no_token check (status <> 'draft' or token_hash is null)
);

comment on table public.quotes is 'Quotes owned by an internal user. Only the SHA-256 of a public token is stored.';
comment on column public.quotes.token_hash is 'SHA-256 of the public token. The token itself is never persisted.';

create unique index quotes_token_hash_idx on public.quotes (token_hash) where token_hash is not null;
create index quotes_owner_id_idx on public.quotes (owner_id);
create index quotes_client_id_idx on public.quotes (client_id);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  sort_order integer not null,
  description text not null,
  quantity numeric(12, 3) not null,
  unit_price_cents bigint not null,
  tax_rate numeric(5, 2) not null default 21.00,
  line_total_cents bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_items_description_length check (char_length(description) between 1 and 300),
  constraint quote_items_sort_order_positive check (sort_order >= 0),
  constraint quote_items_sort_order_unique unique (quote_id, sort_order),
  constraint quote_items_quantity_positive check (quantity > 0),
  constraint quote_items_unit_price_non_negative check (unit_price_cents >= 0),
  constraint quote_items_line_total_non_negative check (line_total_cents >= 0),
  constraint quote_items_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100)
);

comment on table public.quote_items is 'Line items of a quote. Amounts are integer cents.';

create index quote_items_quote_id_idx on public.quote_items (quote_id);

create table public.quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint quote_events_type_supported check (
    event_type in ('created', 'shared', 'viewed', 'accepted', 'rejected', 'expired', 'revoked')
  )
);

comment on table public.quote_events is 'Append-only history. Rows are written by server-side functions, never by clients.';

create index quote_events_quote_id_idx on public.quote_events (quote_id, occurred_at);

-- Keep updated_at accurate with the trigger introduced by the foundation migration.

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

create trigger quote_items_set_updated_at
  before update on public.quote_items
  for each row execute function public.set_updated_at();

-- Row level security. Anonymous visitors never reach these tables directly;
-- the public link is served by the security definer functions added later.

alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_events enable row level security;

revoke all on table public.clients from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_items from anon, authenticated;
revoke all on table public.quote_events from anon, authenticated;

grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.quote_items to authenticated;
grant select on table public.quote_events to authenticated;

create policy "Owners read their own clients"
  on public.clients for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners create their own clients"
  on public.clients for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners update their own clients"
  on public.clients for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners delete their own clients"
  on public.clients for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners read their own quotes"
  on public.quotes for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners create their own quotes"
  on public.quotes for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners update their own quotes"
  on public.quotes for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners delete their own quotes"
  on public.quotes for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners read items of their own quotes"
  on public.quote_items for select to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.owner_id = (select auth.uid())
    )
  );

create policy "Owners create items on their own quotes"
  on public.quote_items for insert to authenticated
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.owner_id = (select auth.uid())
    )
  );

create policy "Owners update items of their own quotes"
  on public.quote_items for update to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.owner_id = (select auth.uid())
    )
  );

create policy "Owners delete items of their own quotes"
  on public.quote_items for delete to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.owner_id = (select auth.uid())
    )
  );

create policy "Owners read the history of their own quotes"
  on public.quote_events for select to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_events.quote_id and q.owner_id = (select auth.uid())
    )
  );
