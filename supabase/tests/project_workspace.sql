-- Existing users are read only; all project fixtures are rolled back.
begin;
do $test$
declare
  owners uuid[]; pa uuid; pb uuid; pa2 uuid; aa uuid; ab uuid; pending_id uuid; chat_a uuid; chat_b uuid; affected integer;
begin
  select array_agg(id) into owners from (select id from auth.users order by id limit 2) u;
  if cardinality(owners) < 2 then raise exception 'Requires two existing users'; end if;
  insert into public.cloudops_projects(user_id,name) values(owners[1],'WORKSPACE A') returning id into pa;
  insert into public.cloudops_projects(user_id,name) values(owners[1],'WORKSPACE A2') returning id into pa2;
  insert into public.cloudops_projects(user_id,name) values(owners[2],'WORKSPACE B') returning id into pb;
  insert into public.cloudops_project_analyses(user_id,project_id,status,model,prompt_version,started_at,finished_at,summary,risk_level)
    values(owners[1],pa,'completed','test','test',now(),now(),'Summary A','unknown') returning id into aa;
  insert into public.cloudops_project_analyses(user_id,project_id,status,model,prompt_version,started_at,finished_at,summary,risk_level)
    values(owners[2],pb,'completed','test','test',now(),now(),'Summary B','unknown') returning id into ab;
  insert into public.cloudops_project_analyses(user_id,project_id,model,prompt_version)
    values(owners[1],pa,'test','test') returning id into pending_id;
  insert into public.cloudops_project_conversations(user_id,project_id,analysis_id,question,answer)
    values(owners[1],pa,aa,'Question A','{"summary":"A"}') returning id into chat_a;
  insert into public.cloudops_project_conversations(user_id,project_id,analysis_id,question,answer)
    values(owners[2],pb,ab,'Question B','{"summary":"B"}') returning id into chat_b;
  perform set_config('request.jwt.claim.sub', owners[1]::text, true);
  execute 'set local role authenticated';
  insert into public.cloudops_analysis_tasks(project_id,analysis_id,task_id,completed) values(pa,aa,'validate-cost',true)
    on conflict(user_id,project_id,analysis_id,task_id) do update set completed=excluded.completed;
  insert into public.cloudops_analysis_tasks(project_id,analysis_id,task_id,completed) values(pa,aa,'validate-cost',false)
    on conflict(user_id,project_id,analysis_id,task_id) do update set completed=excluded.completed;
  if not exists(select 1 from public.cloudops_analysis_tasks t where t.project_id=pa and t.analysis_id=aa and not t.completed) then raise exception 'Own task not persisted'; end if;
  begin
    insert into public.cloudops_analysis_tasks(project_id,analysis_id,task_id) values(pa,pending_id,'validate-cost');
    raise exception 'TEST FAILURE: incomplete analysis accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cloudops_analysis_tasks(project_id,analysis_id,task_id) values(pa2,aa,'validate-cost');
    raise exception 'TEST FAILURE: cross-project task accepted';
  exception when insufficient_privilege or foreign_key_violation then null; end;
  begin
    insert into public.cloudops_analysis_tasks(user_id,project_id,analysis_id,task_id) values(owners[2],pb,ab,'validate-cost');
    raise exception 'TEST FAILURE: foreign owner task accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.cloudops_analysis_tasks set user_id=owners[2] where project_id=pa;
    raise exception 'TEST FAILURE: task owner reassigned';
  exception when insufficient_privilege then null; end;
  if not exists(select 1 from public.cloudops_project_conversations where id=chat_a) then raise exception 'Own conversation hidden'; end if;
  if exists(select 1 from public.cloudops_project_conversations where id=chat_b) then raise exception 'Foreign conversation leaked'; end if;
  begin
    insert into public.cloudops_project_conversations(user_id,project_id,analysis_id,question,answer) values(owners[1],pa,aa,'Forged','{}');
    raise exception 'TEST FAILURE: browser forged AI answer';
  exception when insufficient_privilege then null; end;
  delete from public.cloudops_analysis_tasks where project_id=pa;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Own task delete failed'; end if;
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.cloudops_analysis_tasks;
    raise exception 'TEST FAILURE: anonymous task access';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.cloudops_project_conversations;
    raise exception 'TEST FAILURE: anonymous conversation access';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end;
$test$;
rollback;
