-- Estuda+ / Hotmart
-- Rode este script no Supabase SQL Editor antes de ativar o webhook da Hotmart.
-- Ele cria a carteira de creditos, assinaturas, eventos de pagamento e a rotina
-- segura usada pela Edge Function hotmart-webhook.

create extension if not exists pgcrypto;

create table if not exists public.hotmart_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null default 'UNKNOWN',
  product_id text,
  offer_code text,
  buyer_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'received',
  action text not null default 'ignored',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null,
  plan_label text not null,
  product_id text not null,
  offer_code text not null,
  status text not null default 'active',
  source text not null default 'hotmart',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source text not null default 'hotmart',
  event_id text references public.hotmart_webhook_events(event_id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.hotmart_webhook_events enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_credit_wallets enable row level security;
alter table public.user_credit_transactions enable row level security;

create or replace function public.estuda_payments_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean := false;
begin
  if to_regprocedure('private.current_user_is_admin()') is not null then
    execute 'select private.current_user_is_admin()' into v_result;
    return coalesce(v_result, false);
  end if;

  if to_regprocedure('public.current_user_is_admin()') is not null then
    execute 'select public.current_user_is_admin()' into v_result;
    return coalesce(v_result, false);
  end if;

  return false;
end;
$$;

revoke all on function public.estuda_payments_is_admin() from public, anon;
grant execute on function public.estuda_payments_is_admin() to authenticated;

drop policy if exists "Usuario le propria assinatura" on public.user_subscriptions;
create policy "Usuario le propria assinatura"
on public.user_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuario le propria carteira" on public.user_credit_wallets;
create policy "Usuario le propria carteira"
on public.user_credit_wallets for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuario le proprias transacoes" on public.user_credit_transactions;
create policy "Usuario le proprias transacoes"
on public.user_credit_transactions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Administrador le eventos Hotmart" on public.hotmart_webhook_events;
create policy "Administrador le eventos Hotmart"
on public.hotmart_webhook_events for select to authenticated
using ((select public.estuda_payments_is_admin()));

drop policy if exists "Administrador le assinaturas" on public.user_subscriptions;
create policy "Administrador le assinaturas"
on public.user_subscriptions for select to authenticated
using ((select public.estuda_payments_is_admin()));

drop policy if exists "Administrador le carteiras" on public.user_credit_wallets;
create policy "Administrador le carteiras"
on public.user_credit_wallets for select to authenticated
using ((select public.estuda_payments_is_admin()));

drop policy if exists "Administrador le transacoes de creditos" on public.user_credit_transactions;
create policy "Administrador le transacoes de creditos"
on public.user_credit_transactions for select to authenticated
using ((select public.estuda_payments_is_admin()));

create or replace function public.apply_hotmart_purchase(
  p_event_id text,
  p_event_type text,
  p_buyer_email text,
  p_product_id text,
  p_offer_code text,
  p_status text,
  p_plan_id text,
  p_plan_label text,
  p_credit_amount integer,
  p_payload jsonb
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
  v_status text := upper(coalesce(p_status, 'UNKNOWN'));
begin
  insert into public.hotmart_webhook_events (
    event_id, event_type, product_id, offer_code, buyer_email, status, payload
  )
  values (
    v_event_id,
    coalesce(nullif(p_event_type, ''), 'UNKNOWN'),
    nullif(p_product_id, ''),
    nullif(p_offer_code, ''),
    lower(nullif(p_buyer_email, '')),
    v_status,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_id) do nothing;

  if not found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'event_id', v_event_id);
  end if;

  select id
    into v_user_id
    from auth.users
   where lower(email) = lower(coalesce(p_buyer_email, ''))
   order by created_at desc
   limit 1;

  if v_user_id is null then
    update public.hotmart_webhook_events
       set status = 'pending_user',
           action = 'waiting_for_matching_email'
     where event_id = v_event_id;
    return jsonb_build_object('ok', true, 'pending_user', true, 'event_id', v_event_id);
  end if;

  if v_status in ('APPROVED', 'COMPLETE', 'COMPLETED', 'PURCHASE_APPROVED', 'SUBSCRIPTION_ACTIVE') then
    if coalesce(p_credit_amount, 0) > 0 then
      insert into public.user_credit_wallets (user_id, credits, updated_at)
      values (v_user_id, p_credit_amount, now())
      on conflict (user_id) do update
        set credits = public.user_credit_wallets.credits + excluded.credits,
            updated_at = now();

      insert into public.user_credit_transactions (user_id, amount, reason, event_id)
      values (v_user_id, p_credit_amount, 'Compra de creditos Hotmart', v_event_id);

      v_action := 'credits_added';
    elsif coalesce(p_plan_id, '') <> '' then
      insert into public.user_subscriptions (
        user_id, plan_id, plan_label, product_id, offer_code, status, updated_at
      )
      values (
        v_user_id, p_plan_id, coalesce(p_plan_label, p_plan_id),
        coalesce(p_product_id, ''), coalesce(p_offer_code, ''), 'active', now()
      )
      on conflict (user_id) do update
        set plan_id = excluded.plan_id,
            plan_label = excluded.plan_label,
            product_id = excluded.product_id,
            offer_code = excluded.offer_code,
            status = 'active',
            updated_at = now();

      v_action := 'subscription_activated';
    end if;
  elsif v_status in ('CANCELED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK', 'OVERDUE', 'SUBSCRIPTION_CANCELED') then
    if coalesce(p_plan_id, '') <> '' then
      update public.user_subscriptions
         set status = lower(v_status),
             updated_at = now()
       where user_id = v_user_id
         and product_id = coalesce(p_product_id, product_id);
      v_action := 'subscription_status_updated';
    end if;
  end if;

  update public.hotmart_webhook_events
     set target_user_id = v_user_id,
         action = v_action
   where event_id = v_event_id;

  return jsonb_build_object('ok', true, 'event_id', v_event_id, 'user_id', v_user_id, 'action', v_action);
end;
$$;

revoke all on function public.apply_hotmart_purchase(text, text, text, text, text, text, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.apply_hotmart_purchase(text, text, text, text, text, text, text, text, integer, jsonb) to service_role;
grant execute on function public.estuda_payments_is_admin() to service_role;

revoke all on public.hotmart_webhook_events from anon;
revoke all on public.user_subscriptions from anon;
revoke all on public.user_credit_wallets from anon;
revoke all on public.user_credit_transactions from anon;

grant select on public.user_subscriptions to authenticated;
grant select on public.user_credit_wallets to authenticated;
grant select on public.user_credit_transactions to authenticated;
