-- Rate-limits anonymous/authenticated cart submissions per client fingerprint
-- (hashed IP, computed by the app) to prevent spamming the WhatsApp handoff queue.

alter table public.cart_submissions
  add column if not exists client_fingerprint text;

create index if not exists cart_submissions_fingerprint_created_idx
  on public.cart_submissions (client_fingerprint, created_at);

create or replace function public.check_cart_submission_rate_limit(
  p_fingerprint text,
  p_max_count int default 5,
  p_window_minutes int default 10
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  if p_fingerprint is null or length(p_fingerprint) = 0 then
    return true;
  end if;

  select count(*) into recent_count
  from public.cart_submissions
  where client_fingerprint = p_fingerprint
    and created_at > now() - make_interval(mins => p_window_minutes);

  return recent_count < p_max_count;
end;
$$;

grant execute on function public.check_cart_submission_rate_limit(text, int, int) to anon, authenticated;
