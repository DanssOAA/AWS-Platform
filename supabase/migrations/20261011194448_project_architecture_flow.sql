alter table public.cloudops_project_analyses
  add column architecture_flow jsonb
  check (architecture_flow is null or jsonb_typeof(architecture_flow) = 'object');
comment on column public.cloudops_project_analyses.architecture_flow is
  'Versioned proposed logical flow generated from this analysis. Backend writes only; existing owner SELECT RLS applies. Not deployed AWS topology.';
