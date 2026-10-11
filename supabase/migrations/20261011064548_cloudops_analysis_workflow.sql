-- Server-only transactional workflow. Existing schema remains compatible.
create function public.cloudops_save_source_version(
  p_user uuid, p_source uuid, p_text text, p_hash text, p_revision text, p_coverage jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare s public.cloudops_project_sources; next_version integer; result_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));
  select * into s from public.cloudops_project_sources where id = p_source and user_id = p_user for update;
  if not found then raise exception 'Fuente no disponible'; end if;
  if (select count(*) from public.cloudops_source_versions where user_id = p_user and imported_at > now() - interval '1 hour') >= 30 then
    raise exception 'Límite de 30 importaciones por hora alcanzado';
  end if;
  select coalesce(max(version), 0) + 1 into next_version from public.cloudops_source_versions where source_id = p_source;
  insert into public.cloudops_source_versions(user_id, project_id, source_id, version, extracted_text, content_sha256, resolved_revision, coverage, mime_type)
    values (p_user, s.project_id, p_source, next_version, p_text, p_hash, p_revision, p_coverage, 'text/plain') returning id into result_id;
  return result_id;
end;
$$;

create function public.cloudops_begin_project_analysis(
  p_user uuid, p_project uuid, p_versions uuid[], p_model text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare p public.cloudops_projects; result_id uuid; input_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));
  select * into p from public.cloudops_projects where id = p_project and user_id = p_user and status = 'active' for update;
  if not found then raise exception 'Proyecto no disponible'; end if;
  if coalesce(cardinality(p_versions), 0) not between 1 and 3 then raise exception 'Selecciona de una a tres fuentes'; end if;
  select count(distinct id) into input_count from public.cloudops_source_versions
    where id = any(p_versions) and user_id = p_user and project_id = p_project;
  if input_count <> cardinality(p_versions) then raise exception 'Versiones inválidas para este proyecto'; end if;
  update public.cloudops_project_analyses set status = 'failed', finished_at = now(),
    error_message = 'El análisis anterior agotó su tiempo. Puedes volver a intentarlo.'
    where user_id = p_user and project_id = p_project and status in ('queued','running') and created_at < now() - interval '5 minutes';
  if exists (select 1 from public.cloudops_project_analyses where user_id = p_user and project_id = p_project and status in ('queued','running')) then
    raise exception 'Ya hay un análisis en curso para este proyecto';
  end if;
  if (select count(*) from public.cloudops_project_analyses where user_id = p_user and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Límite de 10 análisis por hora alcanzado';
  end if;
  insert into public.cloudops_project_analyses(user_id, project_id, status, model, prompt_version, started_at, input_context)
    values (p_user, p_project, 'running', p_model, 'project-v1', now(),
      jsonb_build_object('name',p.name,'description',p.description,'preferred_region',p.preferred_region,
        'monthly_budget_usd',p.monthly_budget_usd,'expected_users',p.expected_users,
        'availability_target',p.availability_target,'constraints',p.constraints))
    returning id into result_id;
  insert into public.cloudops_analysis_sources(user_id, project_id, analysis_id, source_version_id)
    select p_user, p_project, result_id, unnest(p_versions);
  return result_id;
end;
$$;

create function public.cloudops_finish_project_analysis(p_user uuid, p_analysis uuid, p_result jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.cloudops_project_analyses; item jsonb; req_id text;
begin
  select * into a from public.cloudops_project_analyses where id = p_analysis and user_id = p_user for update;
  if not found or a.status <> 'running' then raise exception 'Análisis no disponible para finalizar'; end if;
  if coalesce(jsonb_typeof(p_result->'requirements'),'null') <> 'array'
    or jsonb_array_length(p_result->'requirements') not between 1 and 20
    or coalesce(jsonb_typeof(p_result->'findings'),'null') <> 'array' or jsonb_array_length(p_result->'findings') > 20
    or coalesce(jsonb_typeof(p_result->'recommendations'),'null') <> 'array' or jsonb_array_length(p_result->'recommendations') > 15
  then raise exception 'Resultado incompleto'; end if;
  for item in select value from jsonb_array_elements(p_result->'requirements') loop
    insert into public.cloudops_project_requirements(id,user_id,project_id,analysis_id,source_version_id,category,title,description,priority,origin,confidence,evidence_excerpt,evidence_location)
      values ((item->>'id')::uuid,p_user,a.project_id,a.id,(item->>'source_version_id')::uuid,item->>'category',item->>'title',item->>'description',
        item->>'priority',item->>'origin',(item->>'confidence')::numeric,item->>'evidence_excerpt',item->>'evidence_location');
  end loop;
  for item in select value from jsonb_array_elements(p_result->'findings') loop
    insert into public.cloudops_security_findings(user_id,project_id,analysis_id,source_version_id,title,severity,category,description,remediation,evidence_excerpt,evidence_location,confidence)
      values (p_user,a.project_id,a.id,(item->>'source_version_id')::uuid,item->>'title',item->>'severity',item->>'category',item->>'description',
        item->>'remediation',item->>'evidence_excerpt',item->>'evidence_location',(item->>'confidence')::numeric);
  end loop;
  for item in select value from jsonb_array_elements(p_result->'recommendations') loop
    if coalesce(jsonb_typeof(item->'requirement_ids'),'null') <> 'array' or jsonb_array_length(item->'requirement_ids') < 1 then
      raise exception 'Servicio sin requisito asociado';
    end if;
    insert into public.cloudops_aws_recommendations(id,user_id,project_id,analysis_id,service_code,service_name,purpose,rationale,priority,suggested_configuration,alternatives,assumptions,region,deployment_order)
      values ((item->>'id')::uuid,p_user,a.project_id,a.id,item->>'service_code',item->>'service_name',item->>'purpose',item->>'rationale',
        item->>'priority',item->'suggested_configuration',item->'alternatives',item->'assumptions',a.input_context->>'preferred_region',(item->>'deployment_order')::integer);
    for req_id in select jsonb_array_elements_text(item->'requirement_ids') loop
      insert into public.cloudops_recommendation_requirements values (p_user,a.project_id,a.id,(item->>'id')::uuid,req_id::uuid);
    end loop;
  end loop;
  update public.cloudops_project_analyses set status='completed', finished_at=now(), summary=p_result->>'summary',
    security_score=(p_result->>'security_score')::smallint, risk_level=p_result->>'risk_level', limitations=p_result->'limitations'
    where id=a.id;
end;
$$;

revoke all on function public.cloudops_save_source_version(uuid,uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.cloudops_begin_project_analysis(uuid,uuid,uuid[],text) from public, anon, authenticated;
revoke all on function public.cloudops_finish_project_analysis(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.cloudops_save_source_version(uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.cloudops_begin_project_analysis(uuid,uuid,uuid[],text) to service_role;
grant execute on function public.cloudops_finish_project_analysis(uuid,uuid,jsonb) to service_role;
