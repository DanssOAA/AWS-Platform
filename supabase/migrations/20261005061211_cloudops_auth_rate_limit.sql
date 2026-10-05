create table if not exists public.cloudops_auth_attempts (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
create index if not exists cloudops_auth_attempts_window_idx
  on public.cloudops_auth_attempts (window_started_at);

alter table public.cloudops_auth_attempts enable row level security;
revoke all on public.cloudops_auth_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.cloudops_auth_attempts to service_role;

-- Solo la Edge Function con service_role puede consumir un intento.
-- ON CONFLICT actualiza el contador bajo bloqueo de fila para evitar carreras.
create or replace function public.cloudops_consume_auth_attempt(bucket text, max_attempts integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_attempts integer;
begin
  if bucket is null or length(bucket) > 80 or max_attempts is null or max_attempts < 1 or max_attempts > 100 then
    return false;
  end if;
  if bucket = 'global' then
    delete from public.cloudops_auth_attempts where window_started_at < now() - interval '1 day';
  end if;

  insert into public.cloudops_auth_attempts as counters (bucket, attempts)
  values ($1, 1)
  on conflict on constraint cloudops_auth_attempts_pkey do update
  set attempts = case
        when counters.window_started_at <= now() - interval '10 minutes' then 1
        else least(counters.attempts + 1, 101)
      end,
      window_started_at = case
        when counters.window_started_at <= now() - interval '10 minutes' then now()
        else counters.window_started_at
      end
  returning attempts into current_attempts;

  return current_attempts <= max_attempts;
end;
$$;

revoke all on function public.cloudops_consume_auth_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.cloudops_consume_auth_attempt(text, integer) to service_role;
