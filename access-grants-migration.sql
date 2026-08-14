-- Estuda+ - acessos administrativos totais ou parciais.
-- O administrador sempre possui acesso total. Concessoes para estudantes
-- ficam centralizadas no servidor e podem ter data de validade.

create table if not exists public.user_access_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_level text not null check (access_level in ('partial', 'full')),
  unlimited_quizzes boolean not null default false,
  premium_study boolean not null default false,
  essay_without_credits boolean not null default false,
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 300),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > created_at)
);

create index if not exists user_access_grants_granted_by_idx
  on public.user_access_grants (granted_by);

alter table public.user_access_grants enable row level security;

drop policy if exists "Usuario le propria concessao" on public.user_access_grants;
create policy "Usuario le propria concessao"
on public.user_access_grants for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.user_access_grants from anon;
revoke insert, update, delete on public.user_access_grants from authenticated;
grant select on public.user_access_grants to authenticated;

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

  if v_plan_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then
    v_tier := 'family'; v_source := 'subscription';
  elsif v_plan_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then
    v_tier := 'premium'; v_source := 'subscription';
  else
    v_plan_id := 'free'; v_plan_label := 'Plano gratis'; v_plan_status := 'free';
  end if;

  if v_grant.user_id is not null then v_source := 'grant'; end if;
  if v_is_admin then v_source := 'admin'; v_tier := 'admin'; v_plan_id := 'admin'; v_plan_label := 'Acesso administrativo total'; v_plan_status := 'active'; end if;

  return jsonb_build_object(
    'is_admin', v_is_admin,
    'access_source', v_source,
    'access_level', case when v_is_admin then 'full' when v_grant.user_id is not null then v_grant.access_level else 'standard' end,
    'plan_id', v_plan_id,
    'plan_label', case when not v_is_admin and v_grant.access_level = 'full' then 'Acesso total liberado'
                       when not v_is_admin and v_grant.access_level = 'partial' then 'Acesso personalizado'
                       else v_plan_label end,
    'plan_status', v_plan_status,
    'tier', v_tier,
    'credits', coalesce(v_credits, 0),
    'unlimited_quizzes', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.unlimited_quizzes, false) or v_tier in ('premium', 'family'),
    'premium_study', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.premium_study, false) or v_tier in ('premium', 'family'),
    'essay_without_credits', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.essay_without_credits, false),
    'expires_at', v_grant.expires_at,
    'daily_question_limit', case when v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.unlimited_quizzes, false) or v_tier in ('premium', 'family') then null else 10 end,
    'questions_used_today', coalesce(v_used, 0)
  );
end;
$$;

create or replace function public.get_my_access_entitlements()
returns jsonb language sql security invoker set search_path = ''
as $$ select private.get_my_access_entitlements(); $$;

create or replace function private.admin_get_user_access(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_grant public.user_access_grants%rowtype; v_is_admin boolean := false;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = p_target_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  select * into v_grant from public.user_access_grants g where g.user_id = p_target_user_id;
  return jsonb_build_object(
    'is_admin', v_is_admin,
    'access_level', case when v_is_admin then 'full' else coalesce(v_grant.access_level, 'standard') end,
    'unlimited_quizzes', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.unlimited_quizzes, false),
    'premium_study', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.premium_study, false),
    'essay_without_credits', v_is_admin or coalesce(v_grant.access_level = 'full', false) or coalesce(v_grant.essay_without_credits, false),
    'expires_at', v_grant.expires_at,
    'expired', v_grant.expires_at is not null and v_grant.expires_at <= now(),
    'note', coalesce(v_grant.note, ''),
    'updated_at', v_grant.updated_at
  );
end;
$$;

create or replace function public.admin_get_user_access(p_target_user_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_get_user_access(p_target_user_id); $$;

create or replace function private.admin_set_user_access(
  p_target_user_id uuid,
  p_access_level text,
  p_unlimited_quizzes boolean default false,
  p_premium_study boolean default false,
  p_essay_without_credits boolean default false,
  p_expires_at timestamptz default null,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_target_is_admin boolean := false;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_access_level not in ('standard', 'partial', 'full') then raise exception 'INVALID_ACCESS_LEVEL'; end if;
  select coalesce(p.is_admin, false) into v_target_is_admin from public.profiles p where p.id = p_target_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if v_target_is_admin then raise exception 'ADMIN_ACCESS_IS_PERMANENT'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'INVALID_EXPIRATION'; end if;
  if p_access_level = 'partial' and not (coalesce(p_unlimited_quizzes, false) or coalesce(p_premium_study, false) or coalesce(p_essay_without_credits, false)) then
    raise exception 'SELECT_ONE_PERMISSION';
  end if;

  if p_access_level = 'standard' then
    delete from public.user_access_grants where user_id = p_target_user_id;
  else
    insert into public.user_access_grants (
      user_id, access_level, unlimited_quizzes, premium_study,
      essay_without_credits, expires_at, note, granted_by
    ) values (
      p_target_user_id, p_access_level,
      case when p_access_level = 'full' then true else coalesce(p_unlimited_quizzes, false) end,
      case when p_access_level = 'full' then true else coalesce(p_premium_study, false) end,
      case when p_access_level = 'full' then true else coalesce(p_essay_without_credits, false) end,
      p_expires_at, left(coalesce(p_note, ''), 300), auth.uid()
    )
    on conflict (user_id) do update set
      access_level = excluded.access_level,
      unlimited_quizzes = excluded.unlimited_quizzes,
      premium_study = excluded.premium_study,
      essay_without_credits = excluded.essay_without_credits,
      expires_at = excluded.expires_at,
      note = excluded.note,
      granted_by = excluded.granted_by,
      updated_at = now();
  end if;

  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'user_access', p_target_user_id, jsonb_build_object(
    'access_level', p_access_level, 'unlimited_quizzes', p_unlimited_quizzes,
    'premium_study', p_premium_study, 'essay_without_credits', p_essay_without_credits,
    'expires_at', p_expires_at
  ));
  return private.admin_get_user_access(p_target_user_id);
end;
$$;

create or replace function public.admin_set_user_access(
  p_target_user_id uuid,
  p_access_level text,
  p_unlimited_quizzes boolean default false,
  p_premium_study boolean default false,
  p_essay_without_credits boolean default false,
  p_expires_at timestamptz default null,
  p_note text default ''
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_set_user_access(p_target_user_id, p_access_level, p_unlimited_quizzes, p_premium_study, p_essay_without_credits, p_expires_at, p_note); $$;

-- A mesma regra autoritativa protege o limite diario do quiz.
create or replace function private.consume_quiz_access(p_question_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_plan_id text := 'free'; v_status text := 'free';
  v_tier text := 'free'; v_used integer := 0;
  v_requested integer := greatest(1, least(coalesce(p_question_count, 10), 10));
  v_unlimited boolean := false; v_is_admin boolean := false;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = v_user_id and p.account_status = 'active';
  select lower(coalesce(s.plan_id, 'free')), lower(coalesce(s.status, 'free')) into v_plan_id, v_status
  from public.user_subscriptions s where s.user_id = v_user_id order by s.updated_at desc limit 1;
  if v_is_admin then v_tier := 'admin'; v_unlimited := true;
  elsif exists (select 1 from public.user_access_grants g where g.user_id = v_user_id and (g.expires_at is null or g.expires_at > now()) and (g.access_level = 'full' or g.unlimited_quizzes)) then v_unlimited := true;
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'family%' then v_tier := 'family'; v_unlimited := true;
  elsif v_status in ('active', 'paid', 'complete', 'trialing') and v_plan_id like 'premium%' then v_tier := 'premium'; v_unlimited := true;
  end if;
  if v_unlimited then return jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', true, 'daily_limit', null, 'used_today', 0); end if;
  insert into public.user_quiz_daily_usage (user_id, usage_date, question_count, quiz_count, updated_at)
  values (v_user_id, current_date, 0, 0, now()) on conflict (user_id, usage_date) do nothing;
  select u.question_count into v_used from public.user_quiz_daily_usage u where u.user_id = v_user_id and u.usage_date = current_date for update;
  if v_used + v_requested > 10 then return jsonb_build_object('allowed', false, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used, 'reason', 'daily_limit'); end if;
  update public.user_quiz_daily_usage set question_count = question_count + v_requested, quiz_count = quiz_count + 1, updated_at = now()
  where user_id = v_user_id and usage_date = current_date returning question_count into v_used;
  return jsonb_build_object('allowed', true, 'tier', 'free', 'unlimited', false, 'daily_limit', 10, 'used_today', v_used);
end;
$$;

-- Redacoes gratuitas para administradores e para quem recebeu essa permissao.
alter table public.essay_corrections drop constraint if exists essay_corrections_credits_spent_check;
alter table public.essay_corrections add constraint essay_corrections_credits_spent_check check (credits_spent in (0, 5));

create or replace function public.finalize_essay_correction(
  p_id uuid, p_user_id uuid, p_submission_hash text, p_mode text,
  p_theme text, p_essay_excerpt text, p_word_count integer,
  p_total_score integer, p_correction jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_credits integer := 0; v_existing public.essay_corrections%rowtype;
  v_charge integer := 5; v_is_admin boolean := false;
begin
  if p_user_id is null or p_id is null or p_mode not in ('enem', 'free') or char_length(trim(p_theme)) not between 3 and 300
     or p_word_count < 1 or p_total_score not between 0 and 1000 or p_correction is null then raise exception 'INVALID_ESSAY_CORRECTION'; end if;
  select * into v_existing from public.essay_corrections where user_id = p_user_id and submission_hash = p_submission_hash;
  if found then
    select coalesce(credits, 0) into v_credits from public.user_credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'id', v_existing.id, 'credits_remaining', coalesce(v_credits, 0), 'credits_charged', 0, 'duplicate', true);
  end if;
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = p_user_id and p.account_status = 'active';
  if v_is_admin or exists (
    select 1 from public.user_access_grants g where g.user_id = p_user_id
    and (g.expires_at is null or g.expires_at > now())
    and (g.access_level = 'full' or g.essay_without_credits)
  ) then v_charge := 0; end if;
  select coalesce(credits, 0) into v_credits from public.user_credit_wallets where user_id = p_user_id for update;
  if v_charge = 5 and coalesce(v_credits, 0) < 5 then return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'credits_remaining', coalesce(v_credits, 0)); end if;
  if v_charge > 0 then
    update public.user_credit_wallets set credits = credits - v_charge, updated_at = now() where user_id = p_user_id;
  end if;
  insert into public.essay_corrections (id, user_id, submission_hash, mode, theme, essay_excerpt, word_count, total_score, correction, credits_spent)
  values (p_id, p_user_id, p_submission_hash, p_mode, trim(p_theme), left(coalesce(p_essay_excerpt, ''), 240), p_word_count, p_total_score, p_correction, v_charge);
  if v_charge > 0 then
    insert into public.user_credit_transactions (user_id, amount, reason, source, event_id)
    values (p_user_id, -v_charge, 'Correcao de redacao', 'essay_correction', 'essay:' || p_id::text);
  end if;
  return jsonb_build_object('ok', true, 'id', p_id, 'credits_remaining', coalesce(v_credits, 0) - v_charge, 'credits_charged', v_charge, 'duplicate', false);
end;
$$;

revoke all on function public.get_my_access_entitlements() from public, anon;
grant execute on function public.get_my_access_entitlements() to authenticated;
revoke all on function private.get_my_access_entitlements() from public, anon, authenticated, service_role;
grant execute on function private.get_my_access_entitlements() to authenticated, service_role;

revoke all on function public.admin_get_user_access(uuid) from public, anon;
grant execute on function public.admin_get_user_access(uuid) to authenticated;
revoke all on function private.admin_get_user_access(uuid) from public, anon, authenticated, service_role;
grant execute on function private.admin_get_user_access(uuid) to authenticated, service_role;

revoke all on function public.admin_set_user_access(uuid, text, boolean, boolean, boolean, timestamptz, text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, text, boolean, boolean, boolean, timestamptz, text) to authenticated;
revoke all on function private.admin_set_user_access(uuid, text, boolean, boolean, boolean, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function private.admin_set_user_access(uuid, text, boolean, boolean, boolean, timestamptz, text) to authenticated, service_role;

revoke all on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) to service_role;
