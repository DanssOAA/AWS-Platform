-- Personal task tracking is separate from immutable AI findings and assessments.
create table public.cloudops_analysis_tasks (
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  analysis_id uuid not null,
  task_id text not null check (length(task_id) between 1 and 120),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id, analysis_id, task_id),
  foreign key (user_id, project_id, analysis_id)
    references public.cloudops_project_analyses(user_id, project_id, id) on delete cascade
);
alter table public.cloudops_analysis_tasks enable row level security;
revoke all on public.cloudops_analysis_tasks from public, anon, authenticated;
grant select, insert, update, delete on public.cloudops_analysis_tasks to authenticated;
grant all on public.cloudops_analysis_tasks to service_role;
create policy owner_read on public.cloudops_analysis_tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy owner_insert on public.cloudops_analysis_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.cloudops_project_analyses a where a.id = analysis_id and a.project_id = cloudops_analysis_tasks.project_id and a.status = 'completed'
  ));
create policy owner_update on public.cloudops_analysis_tasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (
    select 1 from public.cloudops_project_analyses a where a.id = analysis_id and a.project_id = cloudops_analysis_tasks.project_id and a.status = 'completed'
  ));
create policy owner_delete on public.cloudops_analysis_tasks for delete to authenticated
  using ((select auth.uid()) = user_id);
create trigger cloudops_analysis_tasks_updated_at before update on public.cloudops_analysis_tasks
  for each row execute function public.cloudops_touch_project_updated_at();
comment on table public.cloudops_analysis_tasks is 'User-reported task completion per analysis; never verification of AI findings or AWS deployment.';

create table public.cloudops_project_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  analysis_id uuid not null,
  question text not null check (length(btrim(question)) between 1 and 2000),
  answer jsonb not null check (jsonb_typeof(answer) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (user_id, project_id, analysis_id)
    references public.cloudops_project_analyses(user_id, project_id, id) on delete cascade
);
create index cloudops_conversations_analysis_idx on public.cloudops_project_conversations(user_id, project_id, analysis_id, created_at desc);
create index cloudops_conversations_quota_idx on public.cloudops_project_conversations(user_id, created_at desc);
alter table public.cloudops_project_conversations enable row level security;
revoke all on public.cloudops_project_conversations from public, anon, authenticated;
grant select on public.cloudops_project_conversations to authenticated;
grant all on public.cloudops_project_conversations to service_role;
create policy owner_read on public.cloudops_project_conversations for select to authenticated
  using ((select auth.uid()) = user_id);
