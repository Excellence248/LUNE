-- Direct messages, display names and profile cover pictures.
--
-- profiles.display_name is the name shown as "you" (any characters, up to 50); username stays the
-- unique @handle. profiles.cover_url is the profile banner: an /api/media/<id> upload or an https URL.
-- Direct messages are private to the two members: the API only ever returns a conversation to its
-- own participants, and blocked or suspended members cannot send.

begin;

alter table public.profiles
  add column display_name text not null default '' check (char_length(display_name) <= 50),
  add column cover_url text not null default '' check (char_length(cover_url) <= 500);

-- Authors in post and reply JSON now carry their display name.
create or replace function public.author_json(p public.profiles) returns jsonb language sql stable as $$
  select jsonb_build_object('username', p.username, 'display_name', p.display_name, 'avatar_url', public.avatar_src(p), 'wallet_address', p.wallet_address);
$$;

-- An uploaded cover counts as "in use", like an avatar, so the daily cleanup keeps it.
create or replace function public.delete_orphan_media() returns int language sql as $$
  with gone as (
    delete from public.media m
    where m.created_at < now() - interval '1 day'
      and not exists (select 1 from public.posts p where p.image_url = '/api/media/' || m.id)
      and not exists (select 1 from public.profiles pr where pr.avatar_url = '/api/media/' || m.id)
      and not exists (select 1 from public.profiles pr where pr.cover_url = '/api/media/' || m.id)
    returning 1
  )
  select count(*)::int from gone;
$$;

insert into public.permissions (name, description) values ('message.send', 'Send direct messages');
insert into public.role_permissions (role, permission) values ('member', 'message.send');

-- One conversation per pair of members; member_a < member_b keeps the pair unique in either order.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.profiles(id) on delete cascade,
  member_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (member_a < member_b),
  unique (member_a, member_b)
);
create index conversations_a_recent on public.conversations (member_a, last_message_at desc);
create index conversations_b_recent on public.conversations (member_b, last_message_at desc);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (btrim(content) <> '' and char_length(content) <= 2000),
  created_at timestamptz not null default clock_timestamp(), -- real time, so messages in one transaction still sort in send order
  read_at timestamptz
);
create index direct_messages_thread on public.direct_messages (conversation_id, created_at, id);
create index direct_messages_unread on public.direct_messages (conversation_id) where read_at is null;

-- Backstop for API bugs: only the two members can write to a conversation, a suspended member
-- cannot send, and neither side can message the other once one has blocked the other.
create function public.guard_direct_message() returns trigger language plpgsql as $$
declare
  c public.conversations;
  other uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if new.sender_id <> c.member_a and new.sender_id <> c.member_b then
    raise exception 'You are not part of this conversation.' using errcode = 'insufficient_privilege';
  end if;
  other := case when new.sender_id = c.member_a then c.member_b else c.member_a end;
  if public.is_suspended(new.sender_id) then
    raise exception 'This account is suspended.' using errcode = 'insufficient_privilege';
  end if;
  if public.is_blocked_between(new.sender_id, other) then
    raise exception 'You can’t message this account.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger direct_messages_guard before insert on public.direct_messages
  for each row execute function public.guard_direct_message();

-- Sends a message, creating the conversation on first contact. One statement, so a refused
-- message (for example a block) leaves no empty conversation behind.
create function public.send_direct_message(sender uuid, recipient uuid, body text) returns public.direct_messages language plpgsql as $$
declare
  conv uuid;
  m public.direct_messages;
begin
  if sender = recipient then
    raise exception 'You can’t message yourself.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where id = recipient) then
    raise exception 'Member not found' using errcode = 'no_data_found';
  end if;
  insert into public.conversations (member_a, member_b) values (least(sender, recipient), greatest(sender, recipient))
  on conflict (member_a, member_b) do update set member_a = excluded.member_a
  returning id into conv;
  insert into public.direct_messages (conversation_id, sender_id, content) values (conv, sender, btrim(body)) returning * into m;
  update public.conversations set last_message_at = m.created_at where id = conv;
  return m;
end;
$$;

-- The moderation log also covers display names and private messages.
alter table public.moderation_events drop constraint if exists moderation_events_surface_check;
alter table public.moderation_events add constraint moderation_events_surface_check
  check (surface in ('post', 'reply', 'bio', 'username', 'display_name', 'message'));

commit;
