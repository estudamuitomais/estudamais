-- Estuda+ — ranking global visível a todos os usuários autenticados.
-- Execute este arquivo no SQL Editor do Supabase em projetos já existentes.

begin;

create table if not exists public.public_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Estudante',
  avatar text not null default '🧑‍🚀',
  points integer not null default 0,
  school_year text,
  answered_total integer not null default 0,
  correct_total integer not null default 0,
  streak_days integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.public_leaderboard add column if not exists answered_total integer not null default 0;
alter table public.public_leaderboard add column if not exists correct_total integer not null default 0;
alter table public.public_leaderboard add column if not exists streak_days integer not null default 0;

create or replace function public.sync_public_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answered integer := 0;
  v_correct integer := 0;
  v_streak integer := 0;
begin
  if tg_op = 'DELETE' then
    delete from public.public_leaderboard
    where user_id = old.id;
    return old;
  end if;

  select
    coalesce(sum(greatest(case when coalesce(stats.value ->> 'total', '') ~ '^\d+$' then (stats.value ->> 'total')::integer else 0 end, 0)), 0),
    coalesce(sum(greatest(case when coalesce(stats.value ->> 'correct', '') ~ '^\d+$' then (stats.value ->> 'correct')::integer else 0 end, 0)), 0)
  into v_answered, v_correct
  from jsonb_each(coalesce(new.app_state -> 'subjectStats', '{}'::jsonb)) as stats;
  v_streak := greatest(case when coalesce(new.app_state ->> 'streakDays', '') ~ '^\d+$' then (new.app_state ->> 'streakDays')::integer else 0 end, 0);

  if new.account_status = 'active' then
    insert into public.public_leaderboard (user_id, display_name, avatar, points, school_year, answered_total, correct_total, streak_days, updated_at)
    values (
      new.id,
      coalesce(nullif(left(btrim(new.name), 60), ''), 'Estudante'),
      coalesce(nullif(new.avatar, ''), '🧑‍🚀'),
      greatest(coalesce(new.points, 0), 0),
      new.school_year,
      v_answered,
      least(v_correct, v_answered),
      v_streak,
      coalesce(new.updated_at, now())
    )
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          avatar = excluded.avatar,
          points = excluded.points,
          school_year = excluded.school_year,
          answered_total = excluded.answered_total,
          correct_total = excluded.correct_total,
          streak_days = excluded.streak_days,
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

insert into public.public_leaderboard (user_id, display_name, avatar, points, school_year, answered_total, correct_total, streak_days, updated_at)
select
  profile.id,
  coalesce(nullif(left(btrim(profile.name), 60), ''), 'Estudante'),
  coalesce(nullif(profile.avatar, ''), '🧑‍🚀'),
  greatest(coalesce(profile.points, 0), 0),
  profile.school_year,
  coalesce(stats.answered_total, 0),
  least(coalesce(stats.correct_total, 0), coalesce(stats.answered_total, 0)),
  greatest(case when coalesce(profile.app_state ->> 'streakDays', '') ~ '^\d+$' then (profile.app_state ->> 'streakDays')::integer else 0 end, 0),
  coalesce(profile.updated_at, now())
from public.profiles profile
left join lateral (
  select
    coalesce(sum(greatest(case when coalesce(item.value ->> 'total', '') ~ '^\d+$' then (item.value ->> 'total')::integer else 0 end, 0)), 0)::integer as answered_total,
    coalesce(sum(greatest(case when coalesce(item.value ->> 'correct', '') ~ '^\d+$' then (item.value ->> 'correct')::integer else 0 end, 0)), 0)::integer as correct_total
  from jsonb_each(coalesce(profile.app_state -> 'subjectStats', '{}'::jsonb)) as item
) stats on true
where profile.account_status = 'active'
on conflict (user_id) do update
  set display_name = excluded.display_name,
      avatar = excluded.avatar,
      points = excluded.points,
      school_year = excluded.school_year,
      answered_total = excluded.answered_total,
      correct_total = excluded.correct_total,
      streak_days = excluded.streak_days,
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
