create table public.cloudops_access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and length(email) between 3 and 254),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  user_id uuid,
  otp_sent_at timestamptz,
  processing_token uuid,
  processing_until timestamptz
);

create index cloudops_access_requests_status_created_idx
  on public.cloudops_access_requests (status, created_at desc, id);

alter table public.cloudops_access_requests enable row level security;
revoke all on public.cloudops_access_requests from public, anon, authenticated;
grant select (id, email, status, created_at, otp_sent_at) on public.cloudops_access_requests to authenticated;
grant all on public.cloudops_access_requests to service_role;

create policy "CloudOps administrators read access requests"
  on public.cloudops_access_requests for select to authenticated
  using ((select auth.jwt()) -> 'app_metadata' ->> 'cloudops_role' = 'admin');

-- No browser write policies. Existing auth.users triggers and FaceIA are unchanged.
