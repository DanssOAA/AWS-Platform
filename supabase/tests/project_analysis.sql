-- Run with execute_sql or SQL Editor as postgres after applying the migration.
-- Uses two existing user IDs without altering Auth. All fixtures are rolled back.
begin;
do $test$
declare
  owners uuid[];
  owner_a uuid;
  owner_b uuid;
  project_a uuid;
  project_a2 uuid;
  project_b uuid;
  source_a uuid;
  source_a2 uuid;
  version_a uuid;
  version_a2 uuid;
  analysis_a uuid;
  analysis_a2 uuid;
  requirement_a uuid;
  requirement_a2 uuid;
  recommendation_a uuid;
  row_count bigint;
  table_name text;
  tables text[] := array[
    'cloudops_projects', 'cloudops_project_sources', 'cloudops_source_versions',
    'cloudops_project_analyses', 'cloudops_analysis_sources', 'cloudops_project_requirements',
    'cloudops_security_findings', 'cloudops_aws_recommendations', 'cloudops_recommendation_requirements'
  ];
begin
  select array_agg(id) into owners from (select id from auth.users order by id limit 2) u;
  if coalesce(cardinality(owners), 0) < 2 then
    raise exception 'This integration test requires two existing test users.';
  end if;
  owner_a := owners[1]; owner_b := owners[2];
  insert into public.cloudops_projects(user_id, name) values (owner_a, 'DB TEST A') returning id into project_a;
  insert into public.cloudops_projects(user_id, name) values (owner_a, 'DB TEST A2') returning id into project_a2;
  insert into public.cloudops_projects(user_id, name) values (owner_b, 'DB TEST B') returning id into project_b;

  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  execute 'set local role authenticated';
  insert into public.cloudops_project_sources(project_id, kind, label, url)
    values (project_a, 'github', 'Test repo', 'https://github.com/example/project') returning id into source_a;
  update public.cloudops_projects set description = 'Owner update permitted' where id = project_a;
  get diagnostics row_count = row_count;
  if row_count <> 1 then raise exception 'Owner could not update project'; end if;
  update public.cloudops_projects set description = 'Should not update' where id = project_b;
  get diagnostics row_count = row_count;
  if row_count <> 0 then raise exception 'Cross-owner update permitted'; end if;
  delete from public.cloudops_projects where id = project_b;
  get diagnostics row_count = row_count;
  if row_count <> 0 then raise exception 'Cross-owner delete permitted'; end if;
  begin
    insert into public.cloudops_project_sources(project_id, kind, label, url)
      values (project_b, 'github', 'Cross-owner', 'https://github.com/example/other');
    raise exception 'Cross-owner source accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.cloudops_projects set user_id = owner_b where id = project_a;
    raise exception 'Owner reassignment permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cloudops_projects(user_id, name) values (owner_b, 'Forged owner');
    raise exception 'Forged owner accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cloudops_project_sources(project_id, kind, label, url)
      values (project_a, 'github', 'Invalid', 'https://github.com.evil.test/repo');
    raise exception 'Lookalike host accepted';
  exception when check_violation then null; end;
  execute 'reset role';

  insert into public.cloudops_project_sources(user_id, project_id, kind, label)
    values (owner_a, project_a2, 'text', 'Second project') returning id into source_a2;
  insert into public.cloudops_source_versions(user_id, project_id, source_id, version, content_sha256, extracted_text)
    values (owner_a, project_a, source_a, 1, repeat('a',64), 'The app needs a database.') returning id into version_a;
  insert into public.cloudops_source_versions(user_id, project_id, source_id, version, content_sha256, extracted_text)
    values (owner_a, project_a2, source_a2, 1, repeat('b',64), 'Other project needs storage.') returning id into version_a2;
  insert into public.cloudops_project_analyses(user_id, project_id, model, prompt_version)
    values (owner_a, project_a, 'test-model', 'test-v1') returning id into analysis_a;
  insert into public.cloudops_project_analyses(user_id, project_id, model, prompt_version)
    values (owner_a, project_a2, 'test-model', 'test-v1') returning id into analysis_a2;
  insert into public.cloudops_analysis_sources values
    (owner_a, project_a, analysis_a, version_a), (owner_a, project_a2, analysis_a2, version_a2);
  insert into public.cloudops_project_requirements(user_id, project_id, analysis_id, source_version_id,
    category, title, description, priority, origin, confidence, evidence_excerpt, evidence_location)
    values (owner_a, project_a, analysis_a, version_a, 'database', 'Database', 'Persistent data', 'must', 'explicit', 0.9, 'needs a database', 'README:1')
    returning id into requirement_a;
  insert into public.cloudops_project_requirements(user_id, project_id, analysis_id, source_version_id,
    category, title, description, priority, origin, confidence, evidence_excerpt, evidence_location)
    values (owner_a, project_a2, analysis_a2, version_a2, 'storage', 'Storage', 'Files', 'must', 'explicit', 0.9, 'needs storage', 'document:1')
    returning id into requirement_a2;
  insert into public.cloudops_security_findings(user_id, project_id, analysis_id, source_version_id,
    title, severity, category, description, remediation, evidence_excerpt, evidence_location, confidence)
    values (owner_a, project_a, analysis_a, version_a, 'Unspecified access control', 'info',
      'access', 'Insufficient detail', 'Clarify access control', 'needs a database', 'README:1', 0.5);
  insert into public.cloudops_aws_recommendations(user_id, project_id, analysis_id, service_code,
    service_name, purpose, rationale, priority)
    values (owner_a, project_a, analysis_a, 'rds', 'Amazon RDS', 'Store data', 'The requirement needs persistent relational data', 'recommended')
    returning id into recommendation_a;
  insert into public.cloudops_recommendation_requirements values
    (owner_a, project_a, analysis_a, recommendation_a, requirement_a);

  begin
    insert into public.cloudops_analysis_sources values (owner_a, project_a, analysis_a, version_a2);
    raise exception 'Cross-project analysis input accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.cloudops_recommendation_requirements values (owner_a, project_a, analysis_a, recommendation_a, requirement_a2);
    raise exception 'Cross-analysis requirement accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.cloudops_project_analyses set security_score = 101 where id = analysis_a;
    raise exception 'Invalid security score accepted';
  exception when check_violation then null; end;
  begin
    update public.cloudops_project_analyses set status = 'completed' where id = analysis_a;
    raise exception 'Incomplete successful analysis accepted';
  exception when check_violation then null; end;
  begin
    update public.cloudops_aws_recommendations set estimated_monthly_min_usd = 10,
      estimated_monthly_max_usd = 20 where id = recommendation_a;
    raise exception 'Cost without price evidence accepted';
  exception when check_violation then null; end;

  execute 'set local role authenticated';
  foreach table_name in array tables loop
    execute format('select count(*) from public.%I where %I = $1', table_name, case when table_name = 'cloudops_projects' then 'id' else 'project_id' end)
      into row_count using project_a;
    if row_count < 1 then raise exception 'Owner cannot read %', table_name; end if;
  end loop;

  -- A browser cannot fabricate analysis results, scores or ingested content.
  foreach table_name in array tables[3:9] loop
    begin
      execute format('insert into public.%I default values', table_name);
      raise exception 'Client write permitted on %', table_name;
    exception when insufficient_privilege then null; end;
    begin
      execute format('update public.%I set user_id = user_id', table_name);
      raise exception 'Client update permitted on %', table_name;
    exception when insufficient_privilege then null; end;
    begin
      execute format('delete from public.%I', table_name);
      raise exception 'Client delete permitted on %', table_name;
    exception when insufficient_privilege then null; end;
  end loop;
  perform set_config('request.jwt.claim.sub', owner_b::text, true);
  foreach table_name in array tables loop
    execute format('select count(*) from public.%I where %I = $1', table_name, case when table_name = 'cloudops_projects' then 'id' else 'project_id' end)
      into row_count using project_a;
    if row_count <> 0 then raise exception 'Cross-owner read permitted on %', table_name; end if;
  end loop;
  execute 'reset role';
  execute 'set local role anon';
  foreach table_name in array tables loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'Anonymous read permitted on %', table_name;
    exception when insufficient_privilege then null; end;
    begin
      execute format('insert into public.%I default values', table_name);
      raise exception 'Anonymous insert permitted on %', table_name;
    exception when insufficient_privilege then null; end;
    begin
      execute format('update public.%I set user_id = user_id', table_name);
      raise exception 'Anonymous update permitted on %', table_name;
    exception when insufficient_privilege then null; end;
    begin
      execute format('delete from public.%I', table_name);
      raise exception 'Anonymous delete permitted on %', table_name;
    exception when insufficient_privilege then null; end;
  end loop;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  execute 'set local role authenticated';
  insert into public.cloudops_projects(name) values ('DB TEST browser-created') returning id into project_b;
  delete from public.cloudops_projects where id = project_b;
  delete from public.cloudops_projects where id = project_a;
  execute 'reset role';
  foreach table_name in array tables loop
    execute format('select count(*) from public.%I where %I = $1', table_name, case when table_name = 'cloudops_projects' then 'id' else 'project_id' end)
      into row_count using project_a;
    if row_count <> 0 then raise exception 'Cascade left rows in %', table_name; end if;
  end loop;
  if not exists (select 1 from public.cloudops_projects where id = project_a2) then
    raise exception 'Deleting one project deleted another';
  end if;
  raise notice 'PASS: ownership, RLS on 9 tables, grants, source URLs, lineage, constraints and cascade deletion.';
end;
$test$;
rollback;
