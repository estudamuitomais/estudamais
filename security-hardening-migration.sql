-- Estuda+ — endurecimento das funções privilegiadas e troca da conta administrativa.
-- Execute uma vez no SQL Editor do Supabase. A migração é transacional e idempotente.
begin;

-- Funções SECURITY DEFINER ficam fora do schema exposto pela Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, supabase_auth_admin;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_admin
      and account_status = 'active'
  );
$$;

create or replace function private.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

-- As políticas usam helpers privados, sem publicar RPCs privilegiadas.
drop policy if exists "Administrador lê perfis" on public.profiles;
create policy "Administrador lê perfis"
on public.profiles for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Administrador vê presenças" on public.user_presence;
create policy "Administrador vê presenças"
on public.user_presence for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Administrador vê denúncias" on public.chat_reports;
create policy "Administrador vê denúncias"
on public.chat_reports for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Administrador atualiza denúncias" on public.chat_reports;
create policy "Administrador atualiza denúncias"
on public.chat_reports for update to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

drop policy if exists "Usuários veem avisos publicados" on public.app_announcements;
create policy "Usuários veem avisos publicados"
on public.app_announcements for select to authenticated
using (published or (select private.current_user_is_admin()));

drop policy if exists "Administrador gerencia avisos" on public.app_announcements;
create policy "Administrador gerencia avisos"
on public.app_announcements for all to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

drop policy if exists "Administrador vê auditoria" on public.admin_audit_log;
create policy "Administrador vê auditoria"
on public.admin_audit_log for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Administrador ve contatos" on public.user_contacts;
create policy "Administrador ve contatos"
on public.user_contacts for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Participantes enviam mensagens" on public.messages;
create policy "Participantes enviam mensagens"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    join public.friendships f
      on least(f.requester_id, f.addressee_id) = least(c.user_a, c.user_b)
     and greatest(f.requester_id, f.addressee_id) = greatest(c.user_a, c.user_b)
    join public.profiles pa on pa.id = c.user_a
    join public.profiles pb on pb.id = c.user_b
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.user_a, c.user_b)
      and f.status = 'accepted'
      and pa.guardian_chat_enabled
      and pb.guardian_chat_enabled
      and not (select private.users_are_blocked(c.user_a, c.user_b))
  )
);

-- Operações sociais privilegiadas: implementação privada e RPC pública invocadora.
create or replace function private.send_friend_request(p_friend_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target public.profiles;
  existing public.friendships;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(p_friend_code), '') is null then raise exception 'FRIEND_CODE_REQUIRED'; end if;

  select * into target
  from public.profiles
  where upper(friend_code) = upper(btrim(p_friend_code))
    and account_status = 'active'
  limit 1;

  if target.id is null then raise exception 'FRIEND_CODE_NOT_FOUND'; end if;
  if target.id = caller_id then raise exception 'CANNOT_ADD_SELF'; end if;

  select * into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(caller_id, target.id)
    and greatest(requester_id, addressee_id) = greatest(caller_id, target.id)
  limit 1;

  if existing.id is not null then
    if existing.status = 'accepted' then raise exception 'ALREADY_FRIENDS'; end if;
    if existing.status = 'pending' then raise exception 'REQUEST_ALREADY_EXISTS'; end if;
    delete from public.friendships where id = existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (caller_id, target.id);
  return jsonb_build_object('ok', true, 'friend_name', target.name);
end;
$$;

create or replace function private.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  request public.friendships;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into request from public.friendships where id = p_request_id for update;
  if request.id is null or request.addressee_id <> caller_id or request.status <> 'pending' then
    raise exception 'REQUEST_NOT_AVAILABLE';
  end if;
  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_request_id;
  return jsonb_build_object('ok', true, 'accepted', p_accept);
end;
$$;

create or replace function private.open_friend_conversation(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  conversation_id uuid;
  first_user uuid;
  second_user uuid;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_friend_id is null or p_friend_id = caller_id then raise exception 'INVALID_FRIEND'; end if;
  first_user := least(caller_id, p_friend_id);
  second_user := greatest(caller_id, p_friend_id);

  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = first_user
      and greatest(requester_id, addressee_id) = second_user
  ) then raise exception 'FRIENDSHIP_REQUIRED'; end if;

  if private.users_are_blocked(caller_id, p_friend_id) then
    raise exception 'CONVERSATION_BLOCKED';
  end if;

  insert into public.conversations (user_a, user_b)
  values (first_user, second_user)
  on conflict (least(user_a, user_b), greatest(user_a, user_b)) do nothing;

  select id into conversation_id
  from public.conversations
  where least(user_a, user_b) = first_user
    and greatest(user_a, user_b) = second_user;
  return conversation_id;
end;
$$;

create or replace function public.send_friend_request(p_friend_code text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.send_friend_request(p_friend_code); $$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.respond_friend_request(p_request_id, p_accept); $$;

create or replace function public.open_friend_conversation(p_friend_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.open_friend_conversation(p_friend_id); $$;

-- Operações administrativas seguem a mesma separação e validam o administrador.
create or replace function private.admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb; top_errors jsonb;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('topic', topic, 'errors', errors) order by errors desc), '[]'::jsonb)
  into top_errors from (
    select error_item.key as topic, sum((error_item.value #>> '{}')::integer) as errors
    from public.profiles p
    cross join lateral jsonb_each(coalesce(p.app_state -> 'topicErrors', '{}'::jsonb)) error_item
    where jsonb_typeof(error_item.value) = 'number'
    group by error_item.key order by errors desc limit 8
  ) ranked;
  select jsonb_build_object(
    'total_users', count(*),
    'active_users', count(*) filter (where account_status = 'active'),
    'suspended_users', count(*) filter (where account_status = 'suspended'),
    'chat_enabled', count(*) filter (where guardian_chat_enabled),
    'active_last_7_days', count(*) filter (where updated_at >= now() - interval '7 days'),
    'total_points', coalesce(sum(points), 0),
    'open_reports', (select count(*) from public.chat_reports where status = 'open'),
    'top_errors', top_errors
  ) into result from public.profiles;
  return result;
end;
$$;

create or replace function private.admin_update_user(p_target_user_id uuid, p_action text, p_value text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare changed_name text;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_target_user_id = auth.uid() and p_action = 'status' and p_value = 'suspended' then raise exception 'CANNOT_SUSPEND_SELF'; end if;
  if p_action = 'status' then
    if p_value not in ('active', 'suspended') then raise exception 'INVALID_STATUS'; end if;
    update public.profiles set account_status = p_value, updated_at = now() where id = p_target_user_id returning name into changed_name;
  elsif p_action = 'chat' then
    if p_value not in ('true', 'false') then raise exception 'INVALID_VALUE'; end if;
    update public.profiles set guardian_chat_enabled = p_value::boolean, updated_at = now() where id = p_target_user_id returning name into changed_name;
  elsif p_action = 'note' then
    update public.profiles set admin_note = left(coalesce(p_value, ''), 500), updated_at = now() where id = p_target_user_id returning name into changed_name;
  else
    raise exception 'INVALID_ACTION';
  end if;
  if changed_name is null then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'user_' || p_action, p_target_user_id, jsonb_build_object('value', p_value));
  return jsonb_build_object('ok', true, 'name', changed_name);
end;
$$;

create or replace function private.admin_update_report(p_report_id bigint, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('open', 'reviewing', 'closed') then raise exception 'INVALID_STATUS'; end if;
  update public.chat_reports set status = p_status where id = p_report_id returning reported_user_id into target_id;
  if target_id is null then raise exception 'REPORT_NOT_FOUND'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'report_status', target_id, jsonb_build_object('report_id', p_report_id, 'status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.admin_save_announcement(p_id uuid, p_title text, p_body text, p_published boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(btrim(p_title)) < 3 or char_length(btrim(p_body)) < 3 then raise exception 'INVALID_ANNOUNCEMENT'; end if;
  if p_id is null then
    insert into public.app_announcements (title, body, published, created_by)
    values (left(btrim(p_title), 100), left(btrim(p_body), 500), p_published, auth.uid()) returning id into saved_id;
  else
    update public.app_announcements
    set title = left(btrim(p_title), 100), body = left(btrim(p_body), 500), published = p_published, updated_at = now()
    where id = p_id returning id into saved_id;
    if saved_id is null then raise exception 'ANNOUNCEMENT_NOT_FOUND'; end if;
  end if;
  insert into public.admin_audit_log (admin_id, action, details)
  values (auth.uid(), 'announcement_saved', jsonb_build_object('announcement_id', saved_id, 'published', p_published));
  return saved_id;
end;
$$;

create or replace function private.admin_delete_announcement(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare deleted boolean;
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  delete from public.app_announcements where id = p_id;
  deleted := found;
  insert into public.admin_audit_log (admin_id, action, details)
  values (auth.uid(), 'announcement_deleted', jsonb_build_object('announcement_id', p_id));
  return deleted;
end;
$$;

create or replace function private.admin_log_whatsapp_contact(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (
    select 1 from public.user_contacts
    where user_id = p_target_user_id and whatsapp_opt_in = true
  ) then raise exception 'WHATSAPP_NOT_AUTHORIZED'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'whatsapp_contact_opened', p_target_user_id, jsonb_build_object('channel', 'whatsapp'));
  return true;
end;
$$;

create or replace function public.admin_dashboard_summary()
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_dashboard_summary(); $$;

create or replace function public.admin_update_user(p_target_user_id uuid, p_action text, p_value text default null)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_update_user(p_target_user_id, p_action, p_value); $$;

create or replace function public.admin_update_report(p_report_id bigint, p_status text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.admin_update_report(p_report_id, p_status); $$;

create or replace function public.admin_save_announcement(p_id uuid, p_title text, p_body text, p_published boolean)
returns uuid language sql security invoker set search_path = ''
as $$ select private.admin_save_announcement(p_id, p_title, p_body, p_published); $$;

create or replace function public.admin_delete_announcement(p_id uuid)
returns boolean language sql security invoker set search_path = ''
as $$ select private.admin_delete_announcement(p_id); $$;

create or replace function public.admin_log_whatsapp_contact(p_target_user_id uuid)
returns boolean language sql security invoker set search_path = ''
as $$ select private.admin_log_whatsapp_contact(p_target_user_id); $$;

-- O gatilho de cadastro também deixa o schema exposto.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, school_year, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'school_year',
    coalesce(new.raw_user_meta_data ->> 'avatar', '🧑‍🚀')
  )
  on conflict (id) do update set
    name = excluded.name,
    school_year = excluded.school_year,
    avatar = excluded.avatar,
    updated_at = now();

  if nullif(new.raw_user_meta_data ->> 'whatsapp_phone', '') is not null then
    insert into public.user_contacts (user_id, whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at)
    values (
      new.id,
      new.raw_user_meta_data ->> 'whatsapp_phone',
      coalesce((new.raw_user_meta_data ->> 'whatsapp_opt_in')::boolean, false),
      case when coalesce((new.raw_user_meta_data ->> 'whatsapp_opt_in')::boolean, false) then now() else null end
    )
    on conflict (user_id) do update set
      whatsapp_phone = excluded.whatsapp_phone,
      whatsapp_opt_in = excluded.whatsapp_opt_in,
      whatsapp_consent_at = excluded.whatsapp_consent_at,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Remove as implementações privilegiadas antigas do schema público.
drop function if exists public.handle_new_user();
drop function if exists public.current_user_is_admin();
drop function if exists public.users_are_blocked(uuid, uuid);

-- A função do event trigger deve ser executada apenas internamente pelo Postgres.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;

-- Menor privilégio: apenas usuários autenticados chamam as RPCs públicas.
revoke all on function public.send_friend_request(text) from public, anon, authenticated;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon, authenticated;
revoke all on function public.open_friend_conversation(uuid) from public, anon, authenticated;
revoke all on function public.admin_dashboard_summary() from public, anon, authenticated;
revoke all on function public.admin_update_user(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_report(bigint, text) from public, anon, authenticated;
revoke all on function public.admin_save_announcement(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_delete_announcement(uuid) from public, anon, authenticated;
revoke all on function public.admin_log_whatsapp_contact(uuid) from public, anon, authenticated;

grant execute on function public.send_friend_request(text) to authenticated, service_role;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated, service_role;
grant execute on function public.open_friend_conversation(uuid) to authenticated, service_role;
grant execute on function public.admin_dashboard_summary() to authenticated, service_role;
grant execute on function public.admin_update_user(uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_update_report(bigint, text) to authenticated, service_role;
grant execute on function public.admin_save_announcement(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function public.admin_delete_announcement(uuid) to authenticated, service_role;
grant execute on function public.admin_log_whatsapp_contact(uuid) to authenticated, service_role;

revoke all on function private.current_user_is_admin() from public, anon, authenticated, service_role;
revoke all on function private.users_are_blocked(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.send_friend_request(text) from public, anon, authenticated, service_role;
revoke all on function private.respond_friend_request(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function private.open_friend_conversation(uuid) from public, anon, authenticated, service_role;
revoke all on function private.admin_dashboard_summary() from public, anon, authenticated, service_role;
revoke all on function private.admin_update_user(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function private.admin_update_report(bigint, text) from public, anon, authenticated, service_role;
revoke all on function private.admin_save_announcement(uuid, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function private.admin_delete_announcement(uuid) from public, anon, authenticated, service_role;
revoke all on function private.admin_log_whatsapp_contact(uuid) from public, anon, authenticated, service_role;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;

grant execute on function private.current_user_is_admin() to authenticated, service_role;
grant execute on function private.users_are_blocked(uuid, uuid) to authenticated, service_role;
grant execute on function private.send_friend_request(text) to authenticated, service_role;
grant execute on function private.respond_friend_request(uuid, boolean) to authenticated, service_role;
grant execute on function private.open_friend_conversation(uuid) to authenticated, service_role;
grant execute on function private.admin_dashboard_summary() to authenticated, service_role;
grant execute on function private.admin_update_user(uuid, text, text) to authenticated, service_role;
grant execute on function private.admin_update_report(bigint, text) to authenticated, service_role;
grant execute on function private.admin_save_announcement(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function private.admin_delete_announcement(uuid) to authenticated, service_role;
grant execute on function private.admin_log_whatsapp_contact(uuid) to authenticated, service_role;
grant execute on function private.handle_new_user() to supabase_auth_admin;

-- A conta pedida já existe: torna-a administradora e desativa o privilégio temporário.
insert into public.profiles (id, name)
select id, coalesce(nullif(raw_user_meta_data ->> 'name', ''), 'Administrador')
from auth.users
where lower(email) = 'admin@estudemais.net'
on conflict (id) do nothing;

update public.profiles p
set is_admin = true, account_status = 'active', updated_at = now()
from auth.users u
where p.id = u.id and lower(u.email) = 'admin@estudemais.net';

update public.profiles p
set is_admin = false, updated_at = now()
from auth.users u
where p.id = u.id and lower(u.email) = 'admin.temporario@estudamais.app';

-- Falha a transação se a conta solicitada não tiver sido promovida.
do $$
begin
  if not exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = 'admin@estudemais.net'
      and p.is_admin
      and p.account_status = 'active'
  ) then
    raise exception 'ADMIN_ACCOUNT_NOT_READY';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;

-- Verificação pós-migração: deve retornar zero funções públicas SECURITY DEFINER
-- executáveis por visitantes ou usuários autenticados.
select count(*) as exposed_security_definer_functions
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  );
