begin;
do $$
declare
  user_one uuid := '11111111-1111-4111-8111-111111111111';
  user_two uuid := '22222222-2222-4222-8222-222222222222';
  proposal uuid;
  affected int;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (user_one,'one@example.test','{"name":"Persona Uno"}'),
    (user_two,'two@example.test','{"name":"Persona Dos"}');

  perform set_config('request.jwt.claims',json_build_object('sub',user_one,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.proposals(author_id,title,body,category,province,district,corregimiento)
    values(user_one,'Parque seguro para el barrio','Iluminación y espacios accesibles para el parque comunitario.','Urbanización','08','0808','080801')
    returning id into proposal;
  reset role;

  perform set_config('request.jwt.claims',json_build_object('sub',user_two,'role','authenticated')::text,true);
  set local role authenticated;
  if not exists(select 1 from public.proposals where id=proposal) then raise exception 'User two cannot read shared proposal'; end if;
  update public.proposals set title='Intento ajeno' where id=proposal;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User two edited another user proposal'; end if;
  insert into public.likes(proposal_id,user_id) values(proposal,user_two);
  begin
    insert into public.likes(proposal_id,user_id) values(proposal,user_two);
    raise exception 'Duplicate like was allowed';
  exception when unique_violation then null; end;
  insert into public.comments(proposal_id,author_id,body) values(proposal,user_two,'Esta propuesta puede ayudar al barrio.');
  reset role;

  perform set_config('request.jwt.claims',json_build_object('sub',user_one,'role','authenticated')::text,true);
  set local role authenticated;
  if (select count(*) from public.likes where proposal_id=proposal) <> 1 then raise exception 'Shared like missing'; end if;
  if (select count(*) from public.comments where proposal_id=proposal) <> 1 then raise exception 'Shared comment missing'; end if;
  reset role;
end $$;
rollback;
select 'security checks passed' as result;
