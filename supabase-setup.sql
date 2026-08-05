-- Estuda+ — estrutura segura de usuários e progresso.
-- Execute todo este arquivo no SQL Editor do projeto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  school_year text,
  avatar text not null default '🧑‍🚀',
  points integer not null default 0,
  app_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text not null default '';
alter table public.profiles add column if not exists school_year text;
alter table public.profiles add column if not exists avatar text not null default '🧑‍🚀';
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists app_state jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  school_year text,
  phase_number integer not null,
  score integer not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, subject, topic, school_year, phase_number)
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "Usuário lê o próprio perfil" on public.profiles;
create policy "Usuário lê o próprio perfil"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Usuário atualiza o próprio perfil" on public.profiles;
create policy "Usuário atualiza o próprio perfil"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Usuário gerencia o próprio progresso" on public.progress;
create policy "Usuário gerencia o próprio progresso"
on public.progress for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke all on public.progress from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
grant usage, select on sequence public.progress_id_seq to authenticated;

create or replace function public.handle_new_user()
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Cria perfis para usuários que possam ter sido cadastrados antes do gatilho.
insert into public.profiles (id, name, school_year, avatar)
select
  id,
  coalesce(raw_user_meta_data ->> 'name', ''),
  raw_user_meta_data ->> 'school_year',
  coalesce(raw_user_meta_data ->> 'avatar', '🧑‍🚀')
from auth.users
on conflict (id) do nothing;
