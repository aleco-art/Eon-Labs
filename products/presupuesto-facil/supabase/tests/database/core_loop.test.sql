begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('public', 'clients', 'clients table exists');
select has_table('public', 'quotes', 'quotes table exists');
select has_table('public', 'quote_items', 'quote_items table exists');
select has_table('public', 'quote_events', 'quote_events table exists');

select results_eq(
  $$select relrowsecurity from pg_class
     where oid in (
       'public.clients'::regclass,
       'public.quotes'::regclass,
       'public.quote_items'::regclass,
       'public.quote_events'::regclass
     )
     order by oid::regclass::text$$,
  array[true, true, true, true],
  'RLS is enabled on every core loop table'
);

select results_eq(
  $$select count(*)::bigint from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name in ('clients', 'quotes', 'quote_items', 'quote_events')
       and grantee = 'anon'$$,
  array[0::bigint],
  'anonymous users receive no grants on core loop tables'
);

select has_column('public', 'quotes', 'token_hash', 'quotes stores only the token hash');

select results_eq(
  $$select count(*)::bigint from pg_indexes
     where schemaname = 'public' and indexname = 'quotes_token_hash_idx'$$,
  array[1::bigint],
  'the token hash is unique across quotes'
);

-- A public token must never be stored in clear text, so hashing has a single
-- implementation. This pins it to the standard SHA-256 of the UTF-8 bytes.
select results_eq(
  $$select public.hash_quote_token('test')$$,
  array[decode('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 'hex')],
  'hash_quote_token returns the SHA-256 of the token'
);

select has_function('public', 'hash_quote_token', array['text'], 'hash_quote_token exists');
select has_function('public', 'share_quote', array['uuid', 'text', 'timestamptz'], 'share_quote exists');
select has_function('public', 'get_shared_quote', array['text'], 'get_shared_quote exists');
select has_function('public', 'respond_to_quote', array['text', 'text', 'text'], 'respond_to_quote exists');

select results_eq(
  $$select prosecdef from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('get_shared_quote', 'respond_to_quote')
     order by p.proname$$,
  array[true, true],
  'public link functions run as security definer'
);

-- Sharing appends to quote_events, which clients may only read, so it runs as
-- definer too. That bypasses RLS, and the ownership check moves into the body.
select results_eq(
  $$select prosecdef from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'share_quote'$$,
  array[true],
  'sharing runs as definer so it can append to the history'
);

select ok(
  (select prosrc from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'share_quote')
  like '%owner_id = (select auth.uid())%',
  'sharing checks ownership explicitly because definer bypasses RLS'
);

select ok(
  has_function_privilege('anon', 'public.get_shared_quote(text)', 'execute'),
  'anonymous visitors can read a shared quote'
);

select ok(
  has_function_privilege('anon', 'public.respond_to_quote(text, text, text)', 'execute'),
  'anonymous visitors can answer a shared quote'
);

select ok(
  not has_function_privilege('anon', 'public.share_quote(uuid, text, timestamptz)', 'execute'),
  'anonymous visitors cannot share a quote'
);

select ok(
  not has_function_privilege('anon', 'public.hash_quote_token(text)', 'execute'),
  'anonymous visitors cannot hash tokens directly'
);

select results_eq(
  $$select count(*)::bigint from pg_constraint
     where conrelid = 'public.quotes'::regclass
       and conname = 'quotes_total_is_consistent'$$,
  array[1::bigint],
  'quote totals must equal subtotal plus tax'
);

select * from finish();
rollback;
