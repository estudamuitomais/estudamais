-- Corrige a finalização de redações para acessos incluídos e créditos pagos.

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
  v_charge integer := 5;
  v_is_admin boolean := false;
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
    return jsonb_build_object(
      'ok', true, 'id', v_existing.id,
      'credits_remaining', coalesce(v_credits, 0),
      'credits_charged', 0,
      'access_included', v_existing.credits_spent = 0,
      'duplicate', true
    );
  end if;

  select coalesce(p.is_admin, false) into v_is_admin
  from public.profiles p
  where p.id = p_user_id and p.account_status = 'active';

  if v_is_admin or exists (
    select 1 from public.user_access_grants g
    where g.user_id = p_user_id
      and (g.expires_at is null or g.expires_at > now())
      and (g.access_level = 'full' or g.essay_without_credits)
  ) then
    v_charge := 0;
  end if;

  select coalesce(credits, 0) into v_credits
  from public.user_credit_wallets
  where user_id = p_user_id
  for update;

  if v_charge = 5 and coalesce(v_credits, 0) < 5 then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'credits_remaining', coalesce(v_credits, 0));
  end if;

  if v_charge > 0 then
    update public.user_credit_wallets
    set credits = credits - v_charge, updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.essay_corrections (
    id, user_id, submission_hash, mode, theme, essay_excerpt,
    word_count, total_score, correction, credits_spent
  ) values (
    p_id, p_user_id, p_submission_hash, p_mode, trim(p_theme),
    left(coalesce(p_essay_excerpt, ''), 240), p_word_count,
    p_total_score, p_correction, v_charge
  );

  if v_charge > 0 then
    insert into public.user_credit_transactions (user_id, amount, reason, source, event_id)
    values (p_user_id, -v_charge, 'Correção de redação', 'essay_correction', null);
  end if;

  return jsonb_build_object(
    'ok', true, 'id', p_id,
    'credits_remaining', coalesce(v_credits, 0) - v_charge,
    'credits_charged', v_charge,
    'access_included', v_charge = 0,
    'duplicate', false
  );
end;
$$;

revoke all on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_essay_correction(uuid, uuid, text, text, text, text, integer, integer, jsonb) to service_role;
