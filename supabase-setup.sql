-- Estuda+ — estrutura segura de usuários e progresso.
-- Execute todo este arquivo no SQL Editor do projeto Supabase.

begin;

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
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists guardian_chat_enabled boolean not null default false;
alter table public.profiles alter column friend_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

update public.profiles
set friend_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where friend_code is null or btrim(friend_code) = '';

create unique index if not exists profiles_friend_code_unique
on public.profiles (upper(friend_code));

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

-- Histórico imutável de exposição às questões. As duas chaves únicas fazem a
-- reserva do lote ser atômica, inclusive quando duas abas/dispositivos iniciam
-- um quiz ao mesmo tempo.
create table if not exists public.question_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  question_fingerprint text not null,
  subject text not null default '',
  school_year text not null default '',
  seen_at timestamptz not null default now(),
  primary key (user_id, question_id),
  unique (user_id, question_fingerprint)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  online boolean not null default false,
  last_seen timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);

create unique index if not exists conversations_unique_pair
on public.conversations (least(user_a, user_b), greatest(user_a, user_b));

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  kind text not null default 'text' check (kind in ('text', 'question', 'quick_reply')),
  question_payload jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  check (reporter_id <> reported_user_id)
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.question_history enable row level security;
alter table public.friendships enable row level security;
alter table public.user_presence enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.chat_reports enable row level security;

drop policy if exists "Usuário lê o próprio perfil" on public.profiles;
create policy "Usuário lê o próprio perfil"
on public.profiles for select to authenticated
using (
  (select auth.uid()) = id
  or exists (
    select 1 from public.friendships f
    where (f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
       or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)
  )
);

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

drop policy if exists "Usuário lê o próprio histórico de questões" on public.question_history;
create policy "Usuário lê o próprio histórico de questões"
on public.question_history for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuário reserva questões no próprio histórico" on public.question_history;
create policy "Usuário reserva questões no próprio histórico"
on public.question_history for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Participantes veem amizades" on public.friendships;
create policy "Participantes veem amizades"
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "Participantes removem amizades" on public.friendships;
create policy "Participantes removem amizades"
on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "Usuário registra a própria presença" on public.user_presence;
create policy "Usuário registra a própria presença"
on public.user_presence for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuário atualiza a própria presença" on public.user_presence;
create policy "Usuário atualiza a própria presença"
on public.user_presence for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Amigos veem presença" on public.user_presence;
create policy "Amigos veem presença"
on public.user_presence for select to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = (select auth.uid()) and f.addressee_id = user_presence.user_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = user_presence.user_id))
  )
);

drop policy if exists "Amigos veem conversas" on public.conversations;
create policy "Amigos veem conversas"
on public.conversations for select to authenticated
using (
  (select auth.uid()) in (user_a, user_b)
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(conversations.user_a, conversations.user_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(conversations.user_a, conversations.user_b)
  )
);

create or replace function public.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

drop policy if exists "Participantes leem mensagens" on public.messages;
create policy "Participantes leem mensagens"
on public.messages for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = messages.conversation_id
    and (select auth.uid()) in (c.user_a, c.user_b)
));

drop policy if exists "Participantes enviam mensagens" on public.messages;
create policy "Participantes enviam mensagens"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
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
      and not public.users_are_blocked(c.user_a, c.user_b)
  )
);

drop policy if exists "Destinatário marca mensagens lidas" on public.messages;
create policy "Destinatário marca mensagens lidas"
on public.messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.user_a, c.user_b)
  )
)
with check (
  sender_id <> (select auth.uid())
  and read_at is not null
);

drop policy if exists "Usuário gerencia bloqueios" on public.user_blocks;
create policy "Usuário gerencia bloqueios"
on public.user_blocks for all to authenticated
using ((select auth.uid()) = blocker_id)
with check ((select auth.uid()) = blocker_id);

drop policy if exists "Usuário cria denúncias" on public.chat_reports;
create policy "Usuário cria denúncias"
on public.chat_reports for insert to authenticated
with check (
  (select auth.uid()) = reporter_id
  and (
    conversation_id is null
    or exists (
      select 1 from public.conversations c
      where c.id = chat_reports.conversation_id
        and (select auth.uid()) in (c.user_a, c.user_b)
        and reported_user_id in (c.user_a, c.user_b)
        and reported_user_id <> (select auth.uid())
    )
  )
);

drop policy if exists "Usuário vê próprias denúncias" on public.chat_reports;
create policy "Usuário vê próprias denúncias"
on public.chat_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

revoke all on public.profiles from anon;
revoke all on public.progress from anon;
revoke all on public.question_history from anon;
revoke all on public.friendships from anon;
revoke all on public.user_presence from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
revoke all on public.user_blocks from anon;
revoke all on public.chat_reports from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
grant select, insert on public.question_history to authenticated;
grant usage, select on sequence public.progress_id_seq to authenticated;
grant select, delete on public.friendships to authenticated;
grant select, insert, update on public.user_presence to authenticated;
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.chat_reports to authenticated;
grant usage, select on sequence public.chat_reports_id_seq to authenticated;

create or replace function public.send_friend_request(p_friend_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles;
  existing public.friendships;
begin
  select * into target from public.profiles
  where upper(friend_code) = upper(btrim(p_friend_code))
  limit 1;
  if target.id is null then raise exception 'FRIEND_CODE_NOT_FOUND'; end if;
  if target.id = auth.uid() then raise exception 'CANNOT_ADD_SELF'; end if;

  select * into existing from public.friendships
  where least(requester_id, addressee_id) = least(auth.uid(), target.id)
    and greatest(requester_id, addressee_id) = greatest(auth.uid(), target.id)
  limit 1;

  if existing.id is not null then
    if existing.status = 'accepted' then raise exception 'ALREADY_FRIENDS'; end if;
    if existing.status = 'pending' then raise exception 'REQUEST_ALREADY_EXISTS'; end if;
    delete from public.friendships where id = existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), target.id);
  return jsonb_build_object('ok', true, 'friend_name', target.name);
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.friendships;
begin
  select * into request from public.friendships where id = p_request_id for update;
  if request.id is null or request.addressee_id <> auth.uid() or request.status <> 'pending' then
    raise exception 'REQUEST_NOT_AVAILABLE';
  end if;
  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_request_id;
  return jsonb_build_object('ok', true, 'accepted', p_accept);
end;
$$;

create or replace function public.open_friend_conversation(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_id uuid;
  first_user uuid := least(auth.uid(), p_friend_id);
  second_user uuid := greatest(auth.uid(), p_friend_id);
begin
  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = first_user
      and greatest(requester_id, addressee_id) = second_user
  ) then raise exception 'FRIENDSHIP_REQUIRED'; end if;

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = auth.uid() and blocked_id = p_friend_id)
       or (blocker_id = p_friend_id and blocked_id = auth.uid())
  ) then raise exception 'CONVERSATION_BLOCKED'; end if;

  insert into public.conversations (user_a, user_b)
  values (first_user, second_user)
  on conflict (least(user_a, user_b), greatest(user_a, user_b)) do nothing;

  select id into conversation_id from public.conversations
  where least(user_a, user_b) = first_user
    and greatest(user_a, user_b) = second_user;
  return conversation_id;
end;
$$;

revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.open_friend_conversation(uuid) from public, anon;
revoke all on function public.users_are_blocked(uuid, uuid) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.open_friend_conversation(uuid) to authenticated;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_presence') then
    alter publication supabase_realtime add table public.user_presence;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

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

-- Migra os identificadores e fingerprints gravados no JSON pelas versões
-- anteriores. Isso evita que a atualização faça um estudante rever itens já
-- apresentados antes da criação da tabela atômica.
insert into public.question_history (user_id, question_id, question_fingerprint, subject, school_year)
select p.id, old_id.value, 'legacy-id:' || md5(old_id.value), 'Histórico anterior', ''
from public.profiles p
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(p.app_state -> 'seenQuestionIds') = 'array'
    then p.app_state -> 'seenQuestionIds' else '[]'::jsonb end
) as old_id(value)
where nullif(btrim(old_id.value), '') is not null
on conflict do nothing;

insert into public.question_history (user_id, question_id, question_fingerprint, subject, school_year)
select p.id, 'legacy-fingerprint:' || old_fingerprint.value, old_fingerprint.value, 'Histórico anterior', ''
from public.profiles p
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(p.app_state -> 'seenQuestionFingerprints') = 'array'
    then p.app_state -> 'seenQuestionFingerprints' else '[]'::jsonb end
) as old_fingerprint(value)
where nullif(btrim(old_fingerprint.value), '') is not null
on conflict do nothing;

commit;
