-- Estuda+ — controle de acesso às rodadas por plano.
-- A assinatura é atualizada exclusivamente pelos webhooks de pagamento.

create table if not exists public.user_quiz_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  question_count integer not null default 0 check (question_count >= 0),
  quiz_count integer not null default 0 check (quiz_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.user_quiz_daily_usage enable row level security;

drop policy if exists "Usuario le proprio uso diario" on public.user_quiz_daily_usage;
create policy "Usuario le proprio uso diario"
on public.user_quiz_daily_usage for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuario registra proprio uso diario" on public.user_quiz_daily_usage;
drop policy if exists "Usuario atualiza proprio uso diario" on public.user_quiz_daily_usage;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.consume_quiz_access(p_question_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id text := 'free';
  v_status text := 'free';
  v_tier text := 'free';
  v_used integer := 0;
  v_requested integer := greatest(1, least(coalesce(p_question_count, 10), 10));
  v_is_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select coalesce(p.is_admin, false)
    into v_is_admin
    from public.profiles p
   where p.id = v_user_id
     and p.account_status = 'active';

  select lower(coalesce(s.plan_id, 'free')), lower(coalesce(s.status, 'free'))
    into v_plan_id, v_status
    from public.user_subscriptions s
   where s.user_id = v_user_id
   order by s.updated_at desc
   limit 1;

  if v_is_admin then
    v_tier := 'admin';
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then
    v_tier := 'family';
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then
    v_tier := 'premium';
  end if;

  if v_tier in ('admin', 'premium', 'family') then
    return jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', true, 'daily_limit', null, 'used_today', 0);
  end if;

  insert into public.user_quiz_daily_usage (user_id, usage_date, question_count, quiz_count, updated_at)
  values (v_user_id, current_date, 0, 0, now())
  on conflict (user_id, usage_date) do nothing;

  select u.question_count
    into v_used
    from public.user_quiz_daily_usage u
   where u.user_id = v_user_id
     and u.usage_date = current_date
   for update;

  if v_used + v_requested > 10 then
    return jsonb_build_object('allowed', false, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used, 'reason', 'daily_limit');
  end if;

  update public.user_quiz_daily_usage
     set question_count = question_count + v_requested,
         quiz_count = quiz_count + 1,
         updated_at = now()
   where user_id = v_user_id
     and usage_date = current_date
  returning question_count into v_used;

  return jsonb_build_object('allowed', true, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used);
end;
$$;

create or replace function public.consume_quiz_access(p_question_count integer default 10)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.consume_quiz_access(p_question_count); $$;

revoke all on public.user_quiz_daily_usage from anon;
revoke insert, update, delete on public.user_quiz_daily_usage from authenticated;
grant select on public.user_quiz_daily_usage to authenticated;
revoke all on function public.consume_quiz_access(integer) from public, anon;
grant execute on function public.consume_quiz_access(integer) to authenticated;
revoke all on function private.consume_quiz_access(integer) from public, anon, authenticated, service_role;
grant execute on function private.consume_quiz_access(integer) to authenticated, service_role;
