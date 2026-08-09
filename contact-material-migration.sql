-- Estuda+ — contatos privados de WhatsApp e auditoria administrativa.
begin;

create table if not exists public.user_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whatsapp_phone text not null,
  whatsapp_opt_in boolean not null default false,
  whatsapp_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_contacts_whatsapp_check check (whatsapp_phone ~ '^\+55[0-9]{10,11}$')
);

alter table public.user_contacts enable row level security;
drop policy if exists "Usuario ve o proprio contato" on public.user_contacts;
create policy "Usuario ve o proprio contato" on public.user_contacts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Usuario atualiza o proprio contato" on public.user_contacts;
create policy "Usuario atualiza o proprio contato" on public.user_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Usuario insere o proprio contato" on public.user_contacts;
create policy "Usuario insere o proprio contato" on public.user_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Administrador ve contatos" on public.user_contacts;
create policy "Administrador ve contatos" on public.user_contacts for select to authenticated using (public.current_user_is_admin());

revoke all on public.user_contacts from anon;
grant select on public.user_contacts to authenticated;
grant insert (user_id, whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at, updated_at) on public.user_contacts to authenticated;
grant update (whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at, updated_at) on public.user_contacts to authenticated;

create or replace function public.admin_log_whatsapp_contact(p_target_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.current_user_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (select 1 from public.user_contacts where user_id = p_target_user_id and whatsapp_opt_in = true) then raise exception 'WHATSAPP_NOT_AUTHORIZED'; end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'whatsapp_contact_opened', p_target_user_id, jsonb_build_object('channel', 'whatsapp'));
  return true;
end;
$$;

revoke all on function public.admin_log_whatsapp_contact(uuid) from public, anon;
grant execute on function public.admin_log_whatsapp_contact(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, school_year, avatar)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'school_year', coalesce(new.raw_user_meta_data ->> 'avatar', '🧑‍🚀'))
  on conflict (id) do update set name = excluded.name, school_year = excluded.school_year, avatar = excluded.avatar, updated_at = now();
  if nullif(new.raw_user_meta_data ->> 'whatsapp_phone', '') is not null then
    insert into public.user_contacts (user_id, whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at)
    values (new.id, new.raw_user_meta_data ->> 'whatsapp_phone', coalesce((new.raw_user_meta_data ->> 'whatsapp_opt_in')::boolean, false), case when coalesce((new.raw_user_meta_data ->> 'whatsapp_opt_in')::boolean, false) then now() else null end)
    on conflict (user_id) do update set whatsapp_phone = excluded.whatsapp_phone, whatsapp_opt_in = excluded.whatsapp_opt_in, whatsapp_consent_at = excluded.whatsapp_consent_at, updated_at = now();
  end if;
  return new;
end;
$$;

commit;
