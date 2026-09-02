begin;

create extension if not exists pgtap with schema extensions;

select plan(7);
select has_table('public', 'profiles', 'profiles table exists');
select col_is_pk('public', 'profiles', 'id', 'profile id is the primary key');
select has_column('public', 'profiles', 'full_name', 'profile stores a name');
select has_column('public', 'profiles', 'business_name', 'profile stores a business name');
select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.profiles'::regclass$$,
  array[true],
  'RLS is enabled on profiles'
);
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname = 'public' and tablename = 'profiles'$$,
  array[2::bigint],
  'profiles has explicit select and update policies'
);
select results_eq(
  $$select count(*)::bigint from information_schema.role_table_grants where table_schema = 'public' and table_name = 'profiles' and grantee = 'anon'$$,
  array[0::bigint],
  'anonymous users receive no profile grants'
);

select * from finish();
rollback;
