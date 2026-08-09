-- Estuda+ — promove a conta pessoal de Renato sem remover outros administradores.
-- Execute somente depois que renatodagamma@gmail.com existir em Authentication > Users.

begin;

insert into public.profiles (id, name, is_admin, account_status)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'name', ''), 'Renato'),
  true,
  'active'
from auth.users
where lower(email) = 'renatodagamma@gmail.com'
on conflict (id) do update
set is_admin = true,
    account_status = 'active',
    updated_at = now();

do $$
begin
  if not exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = 'renatodagamma@gmail.com'
      and p.is_admin
      and p.account_status = 'active'
  ) then
    raise exception 'RENATO_ADMIN_ACCOUNT_NOT_READY';
  end if;
end;
$$;

commit;

select
  u.email,
  p.name,
  p.is_admin,
  p.account_status
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = 'renatodagamma@gmail.com';
