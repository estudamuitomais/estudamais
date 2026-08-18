-- Limites autoritativos dos planos Estuda+.
-- Free: 10 questoes/dia e 1 estudo de apostila/mes.
-- Premium: quizzes ilimitados e 10 estudos de apostila/mes.
-- Familia: quizzes ilimitados e 30 estudos de apostila/mes.

create table if not exists public.user_feature_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('material_study')),
  period_start date not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period_start)
);

alter table public.user_feature_monthly_usage enable row level security;

drop policy if exists "Users can view own feature usage" on public.user_feature_monthly_usage;
create policy "Users can view own feature usage"
on public.user_feature_monthly_usage for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.user_feature_monthly_usage from public, anon;
grant select on public.user_feature_monthly_usage to authenticated;
revoke insert, update, delete on public.user_feature_monthly_usage from authenticated;
grant all on public.user_feature_monthly_usage to service_role;

create or replace function private.get_my_access_entitlements()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_plan_id text := 'free';
  v_plan_label text := 'Plano gratis';
  v_plan_status text := 'free';
  v_tier text := 'free';
  v_credits integer := 0;
  v_used integer := 0;
  v_material_used integer := 0;
  v_material_limit integer := 1;
  v_grant public.user_access_grants%rowtype;
  v_source text := 'free';
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select coalesce(p.is_admin, false) into v_is_admin
  from public.profiles p
  where p.id = v_user_id and p.account_status = 'active';

  select * into v_grant
  from public.user_access_grants g
  where g.user_id = v_user_id
    and (g.expires_at is null or g.expires_at > now());

  select lower(coalesce(s.plan_id, 'free')), coalesce(s.plan_label, 'Plano gratis'), lower(coalesce(s.status, 'free'))
  into v_plan_id, v_plan_label, v_plan_status
  from public.user_subscriptions s
  where s.user_id = v_user_id
  order by s.updated_at desc
  limit 1;

  select coalesce(w.credits, 0) into v_credits
  from public.user_credit_wallets w where w.user_id = v_user_id;

  select coalesce(u.question_count, 0) into v_used
  from public.user_quiz_daily_usage u
  where u.user_id = v_user_id and u.usage_date = current_date;

  select coalesce(u.usage_count, 0) into v_material_used
  from public.user_feature_monthly_usage u
  where u.user_id = v_user_id
    and u.feature = 'material_study'
    and u.period_start = date_trunc('month', current_date)::date;

  if v_plan_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then
    v_tier := 'family'; v_source := 'subscription'; v_material_limit := 30;
  elsif v_plan_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then
    v_tier := 'premium'; v_source := 'subscription'; v_material_limit := 10;
  else
    v_plan_id := 'free'; v_plan_label := 'Plano gratis'; v_plan_status := 'free'; v_material_limit := 1;
  end if;

  if v_grant.user_id is not null then
    v_source := 'grant';
    if v_grant.access_level = 'full' then v_material_limit := null;
    elsif v_grant.premium_study then v_material_limit := greatest(v_material_limit, 10);
    end if;
  end if;
  if v_is_admin then
    v_source := 'admin'; v_tier := 'admin'; v_plan_id := 'admin';
    v_plan_label := 'Acesso administrativo total'; v_plan_status := 'active'; v_material_limit := null;
  end if;

  return jsonb_build_object(
    'is_admin', v_is_admin,
    'access_source', v_source,
    'access_level', case when v_is_admin then 'full' when v_grant.user_id is not null then v_grant.access_level else 'standard' end,
    'plan_id', v_plan_id,
    'plan_label', case when not v_is_admin and v_grant.access_level = 'partial' and v_grant.unlimited_quizzes and v_grant.premium_study and not v_grant.essay_without_credits then 'Premium liberado pelo administrador'
                       when not v_is_admin and v_grant.access_level = 'full' then 'Acesso total liberado'
                       when not v_is_admin and v_grant.access_level = 'partial' then 'Acesso personalizado'
                       else v_plan_label end,
    'plan_status', v_plan_status,
    'tier', v_tier,
    'credits', coalesce(v_credits, 0),
    'unlimited_quizzes', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.unlimited_quizzes, false) or v_tier in ('premium', 'family'),
    'premium_study', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.premium_study, false) or v_tier in ('premium', 'family'),
    'premium_avatar', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.premium_study, false) or v_tier in ('premium', 'family'),
    'detailed_reports', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.premium_study, false) or v_tier in ('premium', 'family'),
    'essay_without_credits', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.essay_without_credits, false),
    'expires_at', v_grant.expires_at,
    'daily_question_limit', case when v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.unlimited_quizzes, false) or v_tier in ('premium', 'family') then null else 10 end,
    'questions_used_today', coalesce(v_used, 0),
    'material_monthly_limit', v_material_limit,
    'material_used_this_month', coalesce(v_material_used, 0)
  );
end;
$$;

create or replace function private.consume_quiz_access(
  p_question_count integer default 10,
  p_difficulty text default 'Facil',
  p_quiz_mode text default 'Guiado',
  p_quiz_kind text default 'curriculum'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_plan_id text := 'free'; v_status text := 'free';
  v_tier text := 'free'; v_used integer := 0;
  v_requested integer := greatest(1, least(coalesce(p_question_count, 10), 10));
  v_unlimited boolean := false; v_premium boolean := false; v_is_admin boolean := false;
  v_advanced boolean := lower(coalesce(p_difficulty, '')) in ('dificil', 'difícil')
    or lower(coalesce(p_quiz_mode, '')) in ('prova', 'misto')
    or lower(coalesce(p_quiz_kind, '')) in ('enem', 'simulado_enem');
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(p.is_admin, false) into v_is_admin
  from public.profiles p where p.id = v_user_id and p.account_status = 'active';
  select lower(coalesce(s.plan_id, 'free')), lower(coalesce(s.status, 'free')) into v_plan_id, v_status
  from public.user_subscriptions s where s.user_id = v_user_id order by s.updated_at desc limit 1;

  if v_is_admin then v_tier := 'admin'; v_unlimited := true; v_premium := true;
  elsif exists (select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and g.access_level = 'full') then v_unlimited := true; v_premium := true;
  else
    if exists (select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and g.unlimited_quizzes) then v_unlimited := true; end if;
    if exists (select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and g.premium_study) then v_premium := true; end if;
    if v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then v_tier := 'family'; v_unlimited := true; v_premium := true;
    elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then v_tier := 'premium'; v_unlimited := true; v_premium := true;
    end if;
  end if;

  if v_advanced and not v_premium then
    return jsonb_build_object('allowed', false, 'tier', 'free', 'reason', 'premium_required', 'daily_limit', 10, 'used_today', 0);
  end if;
  if v_unlimited then return jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', true, 'daily_limit', null, 'used_today', 0); end if;

  insert into public.user_quiz_daily_usage (user_id, usage_date, question_count, quiz_count, updated_at)
  values (v_user_id, current_date, 0, 0, now()) on conflict (user_id, usage_date) do nothing;
  select u.question_count into v_used from public.user_quiz_daily_usage u
  where u.user_id = v_user_id and u.usage_date = current_date for update;
  if v_used + v_requested > 10 then
    return jsonb_build_object('allowed', false, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used, 'reason', 'daily_limit');
  end if;
  update public.user_quiz_daily_usage set question_count = question_count + v_requested, quiz_count = quiz_count + 1, updated_at = now()
  where user_id = v_user_id and usage_date = current_date returning question_count into v_used;
  return jsonb_build_object('allowed', true, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used);
end;
$$;

create or replace function public.consume_quiz_access(
  p_question_count integer default 10,
  p_difficulty text default 'Facil',
  p_quiz_mode text default 'Guiado',
  p_quiz_kind text default 'curriculum'
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.consume_quiz_access(p_question_count, p_difficulty, p_quiz_mode, p_quiz_kind); $$;

create or replace function private.consume_material_access(p_units integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_plan_id text := 'free'; v_status text := 'free'; v_tier text := 'free';
  v_limit integer := 1; v_used integer := 0; v_units integer := greatest(1, least(coalesce(p_units, 1), 5));
  v_is_admin boolean := false; v_full boolean := false; v_premium_grant boolean := false;
  v_period date := date_trunc('month', current_date)::date;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = v_user_id and p.account_status = 'active';
  select lower(coalesce(s.plan_id, 'free')), lower(coalesce(s.status, 'free')) into v_plan_id, v_status
  from public.user_subscriptions s where s.user_id = v_user_id order by s.updated_at desc limit 1;
  select exists(select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and g.access_level = 'full'),
         exists(select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and g.premium_study)
  into v_full, v_premium_grant;

  if v_is_admin or v_full then
    return jsonb_build_object('allowed', true, 'tier', case when v_is_admin then 'admin' else 'grant' end, 'unlimited', true, 'monthly_limit', null, 'used_this_month', 0);
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then v_tier := 'family'; v_limit := 30;
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then v_tier := 'premium'; v_limit := 10;
  elsif v_premium_grant then v_tier := 'grant'; v_limit := 10;
  end if;

  insert into public.user_feature_monthly_usage (user_id, feature, period_start, usage_count, updated_at)
  values (v_user_id, 'material_study', v_period, 0, now()) on conflict (user_id, feature, period_start) do nothing;
  select usage_count into v_used from public.user_feature_monthly_usage
  where user_id = v_user_id and feature = 'material_study' and period_start = v_period for update;
  if v_used + v_units > v_limit then
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'unlimited', false, 'monthly_limit', v_limit, 'used_this_month', v_used, 'reason', 'monthly_limit');
  end if;
  update public.user_feature_monthly_usage set usage_count = usage_count + v_units, updated_at = now()
  where user_id = v_user_id and feature = 'material_study' and period_start = v_period returning usage_count into v_used;
  return jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', false, 'monthly_limit', v_limit, 'used_this_month', v_used);
end;
$$;

create or replace function public.consume_material_access(p_units integer default 1)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.consume_material_access(p_units); $$;

revoke all on function public.consume_quiz_access(integer, text, text, text) from public, anon;
grant execute on function public.consume_quiz_access(integer, text, text, text) to authenticated;
revoke all on function private.consume_quiz_access(integer, text, text, text) from public, anon, authenticated;
-- A funcao publica e SECURITY INVOKER; o papel autenticado precisa executar
-- esta implementacao privada, que valida auth.uid() antes de qualquer uso.
grant execute on function private.consume_quiz_access(integer, text, text, text) to authenticated, service_role;

revoke all on function public.consume_material_access(integer) from public, anon;
grant execute on function public.consume_material_access(integer) to authenticated;
revoke all on function private.consume_material_access(integer) from public, anon, authenticated;
-- Mesma delegacao segura usada pelo RPC publico acima.
grant execute on function private.consume_material_access(integer) to authenticated, service_role;

notify pgrst, 'reload schema';
