-- Correção de redações por créditos, sem armazenar o texto integral do estudante.

create table if not exists public.essay_corrections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_hash text not null,
  mode text not null check (mode in ('enem', 'free')),
  theme text not null check (char_length(theme) between 3 and 300),
  essay_excerpt text not null default '',
  word_count integer not null check (word_count >= 0),
  total_score integer not null check (total_score between 0 and 1000),
  correction jsonb not null,
  credits_spent integer not null default 5 check (credits_spent = 5),
  created_at timestamptz not null default now()
);

create index if not exists essay_corrections_user_created_idx
  on public.essay_corrections (user_id, created_at desc);
create unique index if not exists essay_corrections_user_submission_idx
  on public.essay_corrections (user_id, submission_hash);

alter table public.essay_corrections enable row level security;

drop policy if exists "Usuario le proprias correcoes" on public.essay_corrections;
create policy "Usuario le proprias correcoes"
on public.essay_corrections for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.essay_corrections from anon;
revoke insert, update, delete on public.essay_corrections from authenticated;
grant select on public.essay_corrections to authenticated;

create or replace function public.finalize_essay_correction(
  p_id uuid,
  p_user_id uuid,
  p_submission_hash text,
  p_mode text,
  p_theme text,
  p_essay_excerpt text,
  p_word_count integer,
  p_total_score integer,
  p_correction jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credits integer;
  v_existing public.essay_corrections%rowtype;
begin
  if p_user_id is null or p_id is null or p_mode not in ('enem', 'free')
     or char_length(trim(p_theme)) not between 3 and 300
     or p_word_count < 1 or p_total_score not between 0 and 1000
     or p_correction is null then
    raise exception 'INVALID_ESSAY_CORRECTION';
  end if;

  select * into v_existing
  from public.essay_corrections
  where user_id = p_user_id and submission_hash = p_submission_hash;

  if found then
    select credits into v_credits from public.user_credit_wallets where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'id', v_existing.id, 'credits_remaining', coalesce(v_credits, 0), 'duplicate', true);
  end if;

  select credits into v_credits
  from public.user_credit_wallets
  where user_id = p_user_id
  for update;

  if coalesce(v_credits, 0) < 5 then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'credits_remaining', coalesce(v_credits, 0));
  end if;

  update public.user_credit_wallets
  set credits = credits - 5, updated_at = now()
  where user_id = p_user_id;

  insert into public.essay_corrections (
    id, user_id, submission_hash, mode, theme, essay_excerpt,
    word_count, total_score, correction, credits_spent
  ) values (
    p_id, p_user_id, p_submission_hash, p_mode, trim(p_theme),
    left(coalesce(p_essay_excerpt, ''), 240), p_word_count,
    p_total_score, p_correction, 5
  );

  insert into public.user_credit_transactions (user_id, amount, reason, source, event_id)
  values (p_user_id, -5, 'Correção de redação', 'essay_correction', 'essay:' || p_id::text);

  return jsonb_build_object('ok', true, 'id', p_id, 'credits_remaining', v_credits - 5, 'duplicate', false);
end;
$$;

revoke all on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) to service_role;
