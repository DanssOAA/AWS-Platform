begin;
do $test$
declare
  owner_id uuid; project_id uuid; source_id uuid; version_id uuid; next_version_id uuid;
  analysis_id uuid; requirement_id uuid := gen_random_uuid(); recommendation_id uuid := gen_random_uuid();
  result jsonb; broken jsonb; total integer;
begin
  select id into owner_id from auth.users order by id limit 1;
  if owner_id is null then raise exception 'Requires an existing test user'; end if;
  insert into public.cloudops_projects(user_id,name,expected_users) values(owner_id,'WORKFLOW TEST',100) returning id into project_id;
  insert into public.cloudops_project_sources(user_id,project_id,kind,label) values(owner_id,project_id,'text','Requirements') returning id into source_id;
  execute 'set local role service_role';
  version_id := public.cloudops_save_source_version(owner_id,source_id,'Necesita PostgreSQL',repeat('a',64),null,'{}');
  next_version_id := public.cloudops_save_source_version(owner_id,source_id,'Necesita PostgreSQL y archivos',repeat('b',64),null,'{}');
  if (select version from public.cloudops_source_versions where id=next_version_id) <> 2 then raise exception 'Version not incremented'; end if;
  analysis_id := public.cloudops_begin_project_analysis(owner_id,project_id,array[version_id],'test-model');
  if (select input_context->>'expected_users' from public.cloudops_project_analyses where id=analysis_id) <> '100' then raise exception 'Missing context snapshot'; end if;
  begin
    perform public.cloudops_begin_project_analysis(owner_id,project_id,array[version_id],'test-model');
    raise exception 'TEST FAILURE: duplicate active analysis accepted';
  exception when raise_exception then
    if sqlerrm <> 'Ya hay un análisis en curso para este proyecto' then raise; end if;
  end;
  result := jsonb_build_object(
    'summary','Necesita una base de datos','security_score',null,'risk_level','unknown','limitations',jsonb_build_array('Solo requisitos'),
    'requirements',jsonb_build_array(jsonb_build_object('id',requirement_id,'source_version_id',version_id,'category','database','title','PostgreSQL',
      'description','Base relacional','priority','must','origin','explicit','confidence',0.9,'evidence_excerpt','Necesita PostgreSQL','evidence_location','texto')),
    'findings','[]'::jsonb,
    'recommendations',jsonb_build_array(jsonb_build_object('id',recommendation_id,'service_code','rds','service_name','Amazon RDS',
      'purpose','Datos','rationale','Requiere PostgreSQL','priority','recommended','suggested_configuration',jsonb_build_object('description','Privada'),
      'alternatives','[]'::jsonb,'assumptions','[]'::jsonb,'deployment_order',1,'requirement_ids',jsonb_build_array(requirement_id)))
  );
  broken := jsonb_set(result,'{recommendations,0,requirement_ids}',jsonb_build_array(gen_random_uuid()));
  begin
    perform public.cloudops_finish_project_analysis(owner_id,analysis_id,broken);
    raise exception 'TEST FAILURE: invalid requirement accepted';
  exception when foreign_key_violation then null; end;
  -- Check rollback using the unique fixture ID, independently of similarly named columns.
  if exists(select 1 from public.cloudops_project_requirements where id=requirement_id) then raise exception 'Partial requirements persisted'; end if;
  if (select status from public.cloudops_project_analyses where id=analysis_id) <> 'running' then raise exception 'Failed transaction changed status'; end if;
  begin
    perform public.cloudops_finish_project_analysis(owner_id,analysis_id,'{}');
    raise exception 'TEST FAILURE: missing result fields accepted';
  exception when raise_exception then
    if sqlerrm <> 'Resultado incompleto' then raise; end if;
  end;
  perform public.cloudops_finish_project_analysis(owner_id,analysis_id,result);
  if (select status from public.cloudops_project_analyses where id=analysis_id) <> 'completed' then raise exception 'Completion not saved'; end if;
  if not exists(select 1 from public.cloudops_recommendation_requirements rr
    where rr.recommendation_id = (result->'recommendations'->0->>'id')::uuid
      and rr.requirement_id = (result->'requirements'->0->>'id')::uuid) then raise exception 'Missing relationship'; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  begin
    perform public.cloudops_begin_project_analysis(owner_id,project_id,array[version_id],'fake');
    raise exception 'TEST FAILURE: browser called privileged workflow';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end;
$test$;
rollback;
