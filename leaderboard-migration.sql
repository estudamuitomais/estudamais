-- Estuda+ — ranking global visível a todos os usuários autenticados.
-- Execute este arquivo no SQL Editor do Supabase em projetos já existentes.

begin;

create table if not exists public.public_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Estudante',
  avatar text not null default '🧑‍🚀',
  points integer not null default 0,
  school_year text,
  updated_at timestamptz not null default now()
);

create or replace function public.sync_public_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_leaderboard
    where user_id = old.id;
    return old;
  end if;

  if new.account_status = 'active' then
    insert into public.public_leaderboard (user_id, display_name, avatar, points, school_year, updated_at)
    values (
      new.id,
      coalesce(nullif(left(btrim(new.name), 60), ''), 'Estudante'),
      coalesce(nullif(new.avatar, ''), '🧑‍🚀'),
      greatest(coalesce(new.points, 0), 0),
      new.school_year,
      coalesce(new.updated_at, now())
    )
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          avatar = excluded.avatar,
          points = excluded.points,
          school_year = excluded.school_year,
          updated_at = excluded.updated_at;
  else
    delete from public.public_leaderboard
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_public_leaderboard_from_profiles on public.profiles;
create trigger sync_public_leaderboard_from_profiles
after insert or update or delete on public.profiles
for each row execute procedure public.sync_public_leaderboard();

insert into public.public_leaderboard (user_id, display_name, avatar, points, school_year, updated_at)
select
  id,
  coalesce(nullif(left(btrim(name), 60), ''), 'Estudante'),
  coalesce(nullif(avatar, ''), '🧑‍🚀'),
  greatest(coalesce(points, 0), 0),
  school_year,
  coalesce(updated_at, now())
from public.profiles
where account_status = 'active'
on conflict (user_id) do update
  set display_name = excluded.display_name,
      avatar = excluded.avatar,
      points = excluded.points,
      school_year = excluded.school_year,
      updated_at = excluded.updated_at;

delete from public.public_leaderboard
where user_id not in (
  select id from public.profiles where account_status = 'active'
);

alter table public.public_leaderboard enable row level security;

drop policy if exists "Usuários veem o ranking global" on public.public_leaderboard;
create policy "Usuários veem o ranking global"
on public.public_leaderboard for select to authenticated
using (true);

revoke all on public.public_leaderboard from anon;
grant select on public.public_leaderboard to authenticated;
revoke all on function public.sync_public_leaderboard() from public, anon, authenticated;

commit;
