-- Additive schema for the future project import / Gemini analysis module.
-- Existing CloudOps and FaceIA tables and functions are intentionally untouched.
create table public.cloudops_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  description text not null default '' check (length(description) <= 10000),
  status text not null default 'active' check (status in ('active', 'archived')),
  preferred_region text,
  monthly_budget_usd numeric(12,2) check (monthly_budget_usd >= 0),
  expected_users integer check (expected_users >= 0),
  availability_target numeric(6,3) check (availability_target > 0 and availability_target <= 100),
  constraints jsonb not null default '{}' check (jsonb_typeof(constraints) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.cloudops_project_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  kind text not null check (kind in ('google_drive', 'google_docs', 'github', 'upload', 'text')),
  label text not null check (length(btrim(label)) between 1 and 240),
  url text check (length(url) <= 2048),
  repository_ref text check (length(repository_ref) <= 240),
  created_at timestamptz not null default now(),
  unique (user_id, project_id, id),
  foreign key (user_id, project_id) references public.cloudops_projects(user_id, id) on delete cascade,
  check (
    (kind = 'google_drive' and url is not null and url ~ '^https://drive[.]google[.]com/[^[:space:]]+$') or
    (kind = 'google_docs' and url is not null and url ~ '^https://docs[.]google[.]com/[^[:space:]]+$') or
    (kind = 'github' and url is not null and url ~ '^https://github[.]com/[^/[:space:]]+/[^[:space:]]+$') or
    (kind in ('upload', 'text') and url is null)
  ),
  check (repository_ref is null or kind = 'github')
);

-- Each import is a new, sanitized snapshot. No credentials or raw provider responses.
create table public.cloudops_source_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  source_id uuid not null,
  version integer not null check (version > 0),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  extracted_text text not null check (length(btrim(extracted_text)) > 0 and octet_length(extracted_text) <= 2097152),
  resolved_revision text,
  mime_type text,
  coverage jsonb not null default '{}' check (jsonb_typeof(coverage) = 'object'),
  imported_at timestamptz not null default now(),
  unique (user_id, project_id, id),
  unique (source_id, version),
  foreign key (user_id, project_id, source_id)
    references public.cloudops_project_sources(user_id, project_id, id) on delete cascade
);

create table public.cloudops_project_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  provider text not null default 'gemini',
  model text not null check (length(btrim(model)) > 0),
  prompt_version text not null check (length(btrim(prompt_version)) > 0),
  input_context jsonb not null default '{}' check (jsonb_typeof(input_context) = 'object'),
  summary text,
  security_score smallint check (security_score between 0 and 100),
  risk_level text check (risk_level in ('unknown', 'low', 'medium', 'high', 'critical')),
  limitations jsonb not null default '[]' check (jsonb_typeof(limitations) = 'array'),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (user_id, project_id, id),
  foreign key (user_id, project_id) references public.cloudops_projects(user_id, id) on delete cascade,
  check (started_at is null or started_at >= created_at),
  check (finished_at is null or finished_at >= coalesce(started_at, created_at)),
  check (
    (status = 'queued' and started_at is null and finished_at is null and error_message is null) or
    (status = 'running' and started_at is not null and finished_at is null and error_message is null) or
    (status = 'completed' and started_at is not null and finished_at is not null
      and summary is not null and length(btrim(summary)) > 0 and risk_level is not null and error_message is null) or
    (status = 'failed' and finished_at is not null and error_message is not null and length(btrim(error_message)) > 0)
  ),
  check (security_score is null or (status = 'completed' and risk_level <> 'unknown'))
);

create table public.cloudops_analysis_sources (
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  source_version_id uuid not null,
  primary key (user_id, project_id, analysis_id, source_version_id),
  foreign key (user_id, project_id, analysis_id)
    references public.cloudops_project_analyses(user_id, project_id, id) on delete cascade,
  foreign key (user_id, project_id, source_version_id)
    references public.cloudops_source_versions(user_id, project_id, id) on delete cascade
);

create table public.cloudops_project_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  source_version_id uuid not null,
  category text not null check (category in ('functional', 'compute', 'storage', 'database', 'network', 'security', 'availability', 'performance', 'budget', 'compliance', 'other')),
  title text not null check (length(btrim(title)) between 1 and 240),
  description text not null,
  priority text not null check (priority in ('must', 'should', 'could')),
  origin text not null check (origin in ('explicit', 'inferred')),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  evidence_excerpt text not null check (length(btrim(evidence_excerpt)) between 1 and 8000),
  evidence_location text not null check (length(btrim(evidence_location)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, project_id, analysis_id, id),
  foreign key (user_id, project_id, analysis_id, source_version_id)
    references public.cloudops_analysis_sources(user_id, project_id, analysis_id, source_version_id) on delete cascade
);

create table public.cloudops_security_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  source_version_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 240),
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  category text not null,
  description text not null,
  remediation text not null,
  evidence_excerpt text not null check (length(btrim(evidence_excerpt)) between 1 and 8000),
  evidence_location text not null check (length(btrim(evidence_location)) > 0),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'confirmed', 'false_positive', 'resolved')),
  cwe_id text check (cwe_id ~ '^CWE-[0-9]+$'),
  created_at timestamptz not null default now(),
  foreign key (user_id, project_id, analysis_id, source_version_id)
    references public.cloudops_analysis_sources(user_id, project_id, analysis_id, source_version_id) on delete cascade
);

create table public.cloudops_aws_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  service_code text not null check (length(btrim(service_code)) between 1 and 120),
  service_name text not null check (length(btrim(service_name)) between 1 and 160),
  purpose text not null,
  rationale text not null check (length(btrim(rationale)) > 0),
  priority text not null check (priority in ('required', 'recommended', 'optional')),
  suggested_configuration jsonb not null default '{}' check (jsonb_typeof(suggested_configuration) = 'object'),
  alternatives jsonb not null default '[]' check (jsonb_typeof(alternatives) = 'array'),
  assumptions jsonb not null default '[]' check (jsonb_typeof(assumptions) = 'array'),
  region text,
  estimated_monthly_min_usd numeric(12,2) check (estimated_monthly_min_usd >= 0),
  estimated_monthly_max_usd numeric(12,2) check (estimated_monthly_max_usd >= estimated_monthly_min_usd),
  pricing_reference_url text check (pricing_reference_url ~ '^https://[^[:space:]]+$'),
  pricing_checked_at timestamptz,
  deployment_order integer check (deployment_order > 0),
  created_at timestamptz not null default now(),
  unique (user_id, project_id, analysis_id, id),
  foreign key (user_id, project_id, analysis_id)
    references public.cloudops_project_analyses(user_id, project_id, id) on delete cascade,
  check ((estimated_monthly_min_usd is null) = (estimated_monthly_max_usd is null)),
  check (estimated_monthly_min_usd is null or (region is not null and pricing_reference_url is not null and pricing_checked_at is not null))
);

-- A recommendation explains which requirements from THIS analysis it satisfies.
create table public.cloudops_recommendation_requirements (
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  recommendation_id uuid not null,
  requirement_id uuid not null,
  primary key (user_id, project_id, analysis_id, recommendation_id, requirement_id),
  foreign key (user_id, project_id, analysis_id, recommendation_id)
    references public.cloudops_aws_recommendations(user_id, project_id, analysis_id, id) on delete cascade,
  foreign key (user_id, project_id, analysis_id, requirement_id)
    references public.cloudops_project_requirements(user_id, project_id, analysis_id, id) on delete cascade
);

create index cloudops_projects_owner_created_idx on public.cloudops_projects(user_id, created_at desc, id);
create index cloudops_analyses_project_created_idx on public.cloudops_project_analyses(user_id, project_id, created_at desc, id);
create index cloudops_versions_source_idx on public.cloudops_source_versions(user_id, project_id, source_id);
create index cloudops_inputs_version_idx on public.cloudops_analysis_sources(user_id, project_id, source_version_id);
create index cloudops_requirements_input_idx on public.cloudops_project_requirements(user_id, project_id, analysis_id, source_version_id);
create index cloudops_findings_input_idx on public.cloudops_security_findings(user_id, project_id, analysis_id, source_version_id);
create index cloudops_links_requirement_idx on public.cloudops_recommendation_requirements(user_id, project_id, analysis_id, requirement_id);

create function public.cloudops_touch_project_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.cloudops_touch_project_updated_at() from public, anon, authenticated;
create trigger cloudops_project_updated_at before update on public.cloudops_projects
  for each row execute function public.cloudops_touch_project_updated_at();

-- Explicit grants: clients may manage project metadata and register sources.
-- Ingestion, model output and scores are written only by the trusted backend.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'cloudops_projects', 'cloudops_project_sources', 'cloudops_source_versions',
    'cloudops_project_analyses', 'cloudops_analysis_sources', 'cloudops_project_requirements',
    'cloudops_security_findings', 'cloudops_aws_recommendations', 'cloudops_recommendation_requirements'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;
grant insert (name, description, preferred_region, monthly_budget_usd, expected_users, availability_target, constraints)
  on public.cloudops_projects to authenticated;
grant update (name, description, status, preferred_region, monthly_budget_usd, expected_users, availability_target, constraints)
  on public.cloudops_projects to authenticated;
grant delete on public.cloudops_projects to authenticated;
create policy owner_insert on public.cloudops_projects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy owner_update on public.cloudops_projects for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.cloudops_projects for delete to authenticated
  using ((select auth.uid()) = user_id);

grant insert (project_id, kind, label, url, repository_ref) on public.cloudops_project_sources to authenticated;
create policy owner_insert on public.cloudops_project_sources for insert to authenticated
  with check ((select auth.uid()) = user_id);

comment on table public.cloudops_projects is 'Independent uploaded projects; AWS constraints are specific to each project.';
comment on table public.cloudops_source_versions is 'Sanitized extracted content snapshots. Importing a URL requires a separate backend integration.';
comment on table public.cloudops_project_analyses is 'Versioned Gemini analysis. Null score means not evaluated; never a security certification.';
comment on table public.cloudops_aws_recommendations is 'Project-specific proposals, not deployed AWS resources. Nullable costs mean not estimated.';
