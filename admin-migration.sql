-- Estuda+ — administração segura. Execute depois de supabase-setup.sql.
begin;

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists admin_note text not null default '';
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active', 'suspended'));

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 3 and 500),
  published boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin and account_status = 'active');
$$;

alter table public.app_announcements enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "Administrador lê perfis" on public.profiles;
create policy "Administrador lê perfis" on public.profiles for select to authenticated
using (public.current_user_is_admin());

drop policy if exists "Administrador vê presenças" on public.user_presence;
create policy "Administrador vê presenças" on public.user_presence for select to authenticated
using (public.current_user_is_admin());

drop policy if exists "Administrador vê denúncias" on public.chat_reports;
create policy "Administrador vê denúncias" on public.chat_reports for select to authenticated
using (public.current_user_is_admin());

drop policy if exists "Administrador atualiza denúncias" on public.chat_reports;
create policy "Administrador atualiza denúncias" on public.chat_reports for update to authenticated
using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Usuários veem avisos publicados" on public.app_announcements;
create policy "Usuários veem avisos publicados" on public.app_announcements for select to authenticated
using (published or public.current_user_is_admin());

drop policy if exists "Administrador gerencia avisos" on public.app_announcements;
create policy "Administrador gerencia avisos" on public.app_announcements for all to authenticated
using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Administrador vê auditoria" on public.admin_audit_log;
create policy "Administrador vê auditoria" on public.admin_audit_log for select to authenticated
using (public.current_user_is_admin());

revoke all on public.app_announcements from anon;
revoke all on public.admin_audit_log from anon;
revoke update on public.profiles from authenticated;
grant update (name, school_year, avatar, points, app_state, updated_at, guardian_chat_enabled) on public.profiles to authenticated;
grant select on public.app_announcements to authenticated;
grant select on public.admin_audit_log to authenticated;
grant usage, select on sequence public.admin_audit_log_id_seq to authenticated;

create or replace function public.admin_dashboard_summary()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare result jsonb; top_errors jsonb;
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('topic', topic, 'errors', errors) order by errors desc), '[]'::jsonb)
  into top_errors from (
    select error_item.key as topic, sum((error_item.value #>> '{}')::integer) as errors
    from public.profiles p
    cross join lateral jsonb_each(coalesce(p.app_state -> 'topicErrors', '{}'::jsonb)) error_item
    where jsonb_typeof(error_item.value) = 'number'
    group by error_item.key order by errors desc limit 8
  ) ranked;
  select jsonb_build_object(
    'total_users', count(*), 'active_users', count(*) filter (where account_status = 'active'),
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

create or replace function public.admin_update_user(p_target_user_id uuid, p_action text, p_value text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare changed_name text;
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_target_user_id = auth.uid() and p_action = 'status' and p_value = 'suspended' then raise exception 'CANNOT_SUSPEND_SELF'; end if;
  if p_action = 'status' then
    if p_value not in ('active', 'suspended') then raise exception 'INVALID_STATUS'; end if;
    update public.profiles set account_status = p_value, updated_at = now() where id = p_target_user_id returning name into changed_name;
  elsif p_action = 'chat' then
    if p_value not in ('true', 'false') then raise exception 'INVALID_VALUE'; end if;
    update public.profiles set guardian_chat_enabled = p_value::boolean, updated_at = now() where id = p_target_user_id returning name into changed_name;
  elsif p_action = 'note' then
    update public.profiles set admin_note = left(coalesce(p_value, ''), 500), updated_at = now() where id = p_target_user_id returning name into changed_name;
  else raise exception 'INVALID_ACTION';
  end if;
  if changed_name is null then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'user_' || p_action, p_target_user_id, jsonb_build_object('value', p_value));
  return jsonb_build_object('ok', true, 'name', changed_name);
end;
$$;

create or replace function public.admin_update_report(p_report_id bigint, p_status text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare target_id uuid;
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('open', 'reviewing', 'closed') then raise exception 'INVALID_STATUS'; end if;
  update public.chat_reports set status = p_status where id = p_report_id returning reported_user_id into target_id;
  if target_id is null then raise exception 'REPORT_NOT_FOUND'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'report_status', target_id, jsonb_build_object('report_id', p_report_id, 'status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_save_announcement(p_id uuid, p_title text, p_body text, p_published boolean)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare saved_id uuid;
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(btrim(p_title)) < 3 or char_length(btrim(p_body)) < 3 then raise exception 'INVALID_ANNOUNCEMENT'; end if;
  if p_id is null then
    insert into public.app_announcements (title, body, published, created_by)
    values (left(btrim(p_title), 100), left(btrim(p_body), 500), p_published, auth.uid()) returning id into saved_id;
  else
    update public.app_announcements set title = left(btrim(p_title), 100), body = left(btrim(p_body), 500), published = p_published, updated_at = now()
    where id = p_id returning id into saved_id;
    if saved_id is null then raise exception 'ANNOUNCEMENT_NOT_FOUND'; end if;
  end if;
  insert into public.admin_audit_log (admin_id, action, details)
  values (auth.uid(), 'announcement_saved', jsonb_build_object('announcement_id', saved_id, 'published', p_published));
  return saved_id;
end;
$$;

create or replace function public.admin_delete_announcement(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare deleted boolean;
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  delete from public.app_announcements where id = p_id; deleted := found;
  insert into public.admin_audit_log (admin_id, action, details)
  values (auth.uid(), 'announcement_deleted', jsonb_build_object('announcement_id', p_id));
  return deleted;
end;
$$;

revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.admin_dashboard_summary() from public, anon;
revoke all on function public.admin_update_user(uuid, text, text) from public, anon;
revoke all on function public.admin_update_report(bigint, text) from public, anon;
revoke all on function public.admin_save_announcement(uuid, text, text, boolean) from public, anon;
revoke all on function public.admin_delete_announcement(uuid) from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.admin_dashboard_summary() to authenticated;
grant execute on function public.admin_update_user(uuid, text, text) to authenticated;
grant execute on function public.admin_update_report(bigint, text) to authenticated;
grant execute on function public.admin_save_announcement(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_announcement(uuid) to authenticated;

commit;
