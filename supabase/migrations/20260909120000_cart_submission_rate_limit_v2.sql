-- Re-introduces rate limiting on public.cart_submissions, the only table with
-- an unauthenticated, unrestricted insert policy (`with check (true)`).
-- The prior fingerprint architecture was removed in
-- 20260823000000_finalize_predeployment_schema.sql because it required a
-- client-side IP hash threaded through a since-deleted API route. This
-- version is enforced entirely inside Postgres via a BEFORE INSERT trigger,
-- so it needs zero application code changes and cannot be bypassed by a
-- client calling Supabase directly with the anon key. It fails open on any
-- unexpected extraction error so a PostgREST/Postgres quirk never blocks a
-- legitimate WhatsApp checkout handoff (see lib/cart-submission-analytics.ts,
-- which already treats insert errors as best-effort and never surfaces them
-- to the customer).

alter table public.cart_submissions
  add column if not exists client_fingerprint text;

create index if not exists cart_submissions_fingerprint_created_idx
  on public.cart_submissions (client_fingerprint, created_at);

-- Minimal audit trail of rejected attempts, for monitoring only. Regular
-- (allowed) submissions are not duplicated here -- cart_submissions itself
-- is the count source for the sliding window, so this table only grows when
-- something is actually being blocked.
create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  identity_hash text not null,
  detail jsonb
);

create index if not exists rate_limit_events_source_created_idx
  on public.rate_limit_events (source, created_at desc);

alter table public.rate_limit_events enable row level security;

grant select on table public.rate_limit_events to authenticated;

drop policy if exists "rate_limit_events_admin_read" on public.rate_limit_events;
create policy "rate_limit_events_admin_read"
  on public.rate_limit_events for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- No insert/update/delete policies for anon/authenticated: writes only
-- happen through the security definer trigger function below.

create or replace function public.cart_submissions_rate_limit_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  forwarded_header text;
  client_ip text;
  identity text;
  identity_hash text;
  recent_count int;
  max_count constant int := 5;
  window_minutes constant int := 10;
begin
  begin
    forwarded_header := (current_setting('request.headers', true)::json) ->> 'x-forwarded-for';
    client_ip := nullif(trim(split_part(coalesce(forwarded_header, ''), ',', 1)), '');
    identity := coalesce(client_ip, auth.uid()::text, 'unknown');
    identity_hash := md5(identity);
  exception when others then
    -- Header/JSON extraction failed unexpectedly: never block checkout over it.
    return new;
  end;

  new.client_fingerprint := identity_hash;

  select count(*) into recent_count
  from public.cart_submissions
  where client_fingerprint = identity_hash
    and created_at > now() - make_interval(mins => window_minutes);

  if recent_count >= max_count then
    insert into public.rate_limit_events (source, identity_hash, detail)
    values ('cart_submissions', identity_hash, jsonb_build_object('recent_count', recent_count, 'max_count', max_count, 'window_minutes', window_minutes));
    raise exception 'Too many requests. Please try again in a few minutes.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  return new;
end;
$$;

drop trigger if exists cart_submissions_rate_limit on public.cart_submissions;
create trigger cart_submissions_rate_limit
  before insert on public.cart_submissions
  for each row execute function public.cart_submissions_rate_limit_guard();
