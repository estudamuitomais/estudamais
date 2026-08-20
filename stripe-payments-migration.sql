-- Estuda+ / Stripe
-- Cria o registro de eventos Stripe e a rotina segura usada pelo webhook.
-- Reaproveita as tabelas user_subscriptions, user_credit_wallets e
-- user_credit_transactions já existentes no app.

create extension if not exists pgcrypto;

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null default 'UNKNOWN',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  buyer_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'received',
  action text not null default 'ignored',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Administrador le eventos Stripe" on public.stripe_webhook_events;
create policy "Administrador le eventos Stripe"
on public.stripe_webhook_events for select to authenticated
using (exists (
  select 1 from public.profiles
   where id = (select auth.uid())
     and is_admin = true
     and account_status = 'active'
));

create or replace function public.apply_stripe_purchase(
  p_event_id text,
  p_event_type text,
  p_buyer_email text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_checkout_session_id text,
  p_status text,
  p_plan_id text,
  p_plan_label text,
  p_credit_amount integer,
  p_payload jsonb,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_action text := 'ignored';
  v_event_id text := coalesce(nullif(p_event_id, ''), gen_random_uuid()::text);
  v_status text := lower(coalesce(p_status, 'unknown'));
begin
  insert into public.stripe_webhook_events (
    event_id, event_type, stripe_customer_id, stripe_subscription_id,
    stripe_checkout_session_id, buyer_email, status, payload
  )
  values (
    v_event_id,
    coalesce(nullif(p_event_type, ''), 'UNKNOWN'),
    nullif(p_stripe_customer_id, ''),
    nullif(p_stripe_subscription_id, ''),
    nullif(p_stripe_checkout_session_id, ''),
    lower(nullif(p_buyer_email, '')),
    v_status,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_id) do nothing;

  if not found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'event_id', v_event_id);
  end if;

  if p_user_id is not null and exists (select 1 from auth.users where id = p_user_id) then
    v_user_id := p_user_id;
  else
    select id
      into v_user_id
      from auth.users
     where lower(email) = lower(coalesce(p_buyer_email, ''))
     order by created_at desc
     limit 1;
  end if;

  if v_user_id is null then
    update public.stripe_webhook_events
       set status = 'pending_user',
           action = 'waiting_for_matching_email'
     where event_id = v_event_id;
    return jsonb_build_object('ok', true, 'pending_user', true, 'event_id', v_event_id);
  end if;

  if coalesce(p_credit_amount, 0) > 0 and v_status in ('paid', 'complete', 'succeeded') then
    insert into public.user_credit_wallets (user_id, credits, updated_at)
    values (v_user_id, p_credit_amount, now())
    on conflict (user_id) do update
      set credits = public.user_credit_wallets.credits + excluded.credits,
          updated_at = now();

    insert into public.user_credit_transactions (user_id, amount, reason, source, event_id)
    values (v_user_id, p_credit_amount, 'Compra de créditos Stripe', 'stripe', null);

    v_action := 'credits_added';
  elsif coalesce(p_plan_id, '') <> '' and v_status in ('active', 'paid', 'complete', 'trialing') then
    insert into public.user_subscriptions (
      user_id, plan_id, plan_label, product_id, offer_code, status, source, updated_at
    )
    values (
      v_user_id,
      p_plan_id,
      coalesce(p_plan_label, p_plan_id),
      coalesce(p_stripe_subscription_id, ''),
      coalesce(p_stripe_customer_id, ''),
      'active',
      'stripe',
      now()
    )
    on conflict (user_id) do update
      set plan_id = excluded.plan_id,
          plan_label = excluded.plan_label,
          product_id = excluded.product_id,
          offer_code = excluded.offer_code,
          status = 'active',
          source = 'stripe',
          updated_at = now();

    v_action := 'subscription_activated';
  elsif coalesce(p_plan_id, '') <> '' and v_status in ('canceled', 'cancelled', 'unpaid', 'past_due', 'incomplete_expired') then
    update public.user_subscriptions
       set status = v_status,
           updated_at = now()
     where user_id = v_user_id
       and source = 'stripe';
    v_action := 'subscription_status_updated';
  end if;

  update public.stripe_webhook_events
     set target_user_id = v_user_id,
         action = v_action
   where event_id = v_event_id;

  return jsonb_build_object('ok', true, 'event_id', v_event_id, 'user_id', v_user_id, 'action', v_action);
end;
$$;

revoke all on function public.apply_stripe_purchase(text, text, text, text, text, text, text, text, text, integer, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.apply_stripe_purchase(text, text, text, text, text, text, text, text, text, integer, jsonb, uuid) to service_role;

revoke all on public.stripe_webhook_events from anon;
