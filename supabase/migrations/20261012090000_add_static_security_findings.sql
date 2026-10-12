alter table public.cloudops_security_findings
  add column detector text not null default 'gemini' check (detector in ('gemini', 'static')),
  add column rule_id text,
  add column scanner_version text,
  add column aws_controls jsonb not null default '[]'::jsonb check (jsonb_typeof(aws_controls) = 'array');

create or replace function public.cloudops_finish_project_analysis(p_user uuid, p_analysis uuid, p_result jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.cloudops_project_analyses; item jsonb; req_id text;
begin
  select * into a from public.cloudops_project_analyses where id = p_analysis and user_id = p_user for update;
  if not found or a.status <> 'running' then raise exception 'Análisis no disponible para finalizar'; end if;
  if coalesce(jsonb_typeof(p_result->'requirements'),'null') <> 'array' or jsonb_array_length(p_result->'requirements') not between 1 and 20
    or coalesce(jsonb_typeof(p_result->'findings'),'null') <> 'array' or jsonb_array_length(p_result->'findings') > 20
    or coalesce(jsonb_typeof(p_result->'recommendations'),'null') <> 'array' or jsonb_array_length(p_result->'recommendations') > 15 then raise exception 'Resultado incompleto'; end if;
  for item in select value from jsonb_array_elements(p_result->'requirements') loop
    insert into public.cloudops_project_requirements(id,user_id,project_id,analysis_id,source_version_id,category,title,description,priority,origin,confidence,evidence_excerpt,evidence_location)
    values ((item->>'id')::uuid,p_user,a.project_id,a.id,(item->>'source_version_id')::uuid,item->>'category',item->>'title',item->>'description',item->>'priority',item->>'origin',(item->>'confidence')::numeric,item->>'evidence_excerpt',item->>'evidence_location');
  end loop;
  for item in select value from jsonb_array_elements(p_result->'findings') loop
    insert into public.cloudops_security_findings(user_id,project_id,analysis_id,source_version_id,title,severity,category,description,remediation,evidence_excerpt,evidence_location,confidence,detector,rule_id,scanner_version,aws_controls)
    values (p_user,a.project_id,a.id,(item->>'source_version_id')::uuid,item->>'title',item->>'severity',item->>'category',item->>'description',item->>'remediation',item->>'evidence_excerpt',item->>'evidence_location',(item->>'confidence')::numeric,coalesce(item->>'detector','gemini'),item->>'rule_id',item->>'scanner_version',coalesce(item->'aws_controls','[]'::jsonb));
  end loop;
  for item in select value from jsonb_array_elements(p_result->'recommendations') loop
    if coalesce(jsonb_typeof(item->'requirement_ids'),'null') <> 'array' or jsonb_array_length(item->'requirement_ids') < 1 then raise exception 'Servicio sin requisito asociado'; end if;
    insert into public.cloudops_aws_recommendations(id,user_id,project_id,analysis_id,service_code,service_name,purpose,rationale,priority,suggested_configuration,alternatives,assumptions,region,deployment_order)
    values ((item->>'id')::uuid,p_user,a.project_id,a.id,item->>'service_code',item->>'service_name',item->>'purpose',item->>'rationale',item->>'priority',item->'suggested_configuration',item->'alternatives',item->'assumptions',a.input_context->>'preferred_region',(item->>'deployment_order')::integer);
    for req_id in select jsonb_array_elements_text(item->'requirement_ids') loop insert into public.cloudops_recommendation_requirements values (p_user,a.project_id,a.id,(item->>'id')::uuid,req_id::uuid); end loop;
  end loop;
  update public.cloudops_project_analyses set status='completed', finished_at=now(), summary=p_result->>'summary', security_score=(p_result->>'security_score')::smallint, risk_level=p_result->>'risk_level', limitations=p_result->'limitations' where id=a.id;
end;
$$;
