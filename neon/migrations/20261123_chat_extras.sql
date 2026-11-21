-- Chat extras: pictures in messages, delete for everyone, emoji reactions, and per-type notification switches.
-- Additive: nothing that exists is removed or changed in a way older code would notice. Run after 20261119_voice_notes.sql.

begin;

-- ---------------------------------------------------------------- pictures in messages
-- Like voice notes, a picture is tied to its conversation, so only the two members can ever open it.
create table public.message_images (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  bytes bytea not null check (octet_length(bytes) between 1 and 4194304),
  created_at timestamptz not null default now()
);
create index message_images_conversation on public.message_images (conversation_id);
create index message_images_sender_recent on public.message_images (sender_id, created_at desc);

alter table public.direct_messages
  add column image_id uuid references public.message_images(id) on delete cascade,
  add column deleted_at timestamptz;

alter table public.direct_messages drop constraint direct_messages_kind_check;
alter table public.direct_messages add constraint direct_messages_kind_check check (kind in ('text', 'voice', 'image'));
alter table public.direct_messages drop constraint direct_messages_body_check;
alter table public.direct_messages add constraint direct_messages_body_check check (
  (kind = 'text' and voice_id is null and image_id is null and btrim(content) <> '' and char_length(content) <= 2000)
  or (kind = 'voice' and voice_id is not null and image_id is null and content = '')
  or (kind = 'image' and image_id is not null and voice_id is null and char_length(content) <= 2000)
);

-- Sends a picture (with an optional caption), creating the conversation on first contact. One statement,
-- so a refused message (for example a block) leaves neither a conversation nor a stored picture behind.
create function public.send_image_message(sender uuid, recipient uuid, mime text, picture bytea, caption text)
returns public.direct_messages language plpgsql as $$
declare
  conv uuid;
  img uuid;
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
  insert into public.message_images (conversation_id, sender_id, content_type, bytes)
  values (conv, sender, mime, picture) returning id into img;
  insert into public.direct_messages (conversation_id, sender_id, content, kind, image_id)
  values (conv, sender, btrim(coalesce(caption, '')), 'image', img) returning * into m;
  update public.conversations set last_message_at = m.created_at where id = conv;
  return m;
end;
$$;

-- ---------------------------------------------------------------- reactions
-- One reaction per member per message (picking another replaces it), like WhatsApp.
create table public.message_reactions (
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index message_reactions_message on public.message_reactions (message_id);

-- Only the two members can react, not across a block, and not to a message that was deleted.
create function public.guard_message_reaction() returns trigger language plpgsql as $$
declare
  c public.conversations;
  m public.direct_messages;
begin
  select * into m from public.direct_messages where id = new.message_id;
  select * into c from public.conversations where id = m.conversation_id;
  if new.user_id <> c.member_a and new.user_id <> c.member_b then
    raise exception 'You are not part of this conversation.' using errcode = 'insufficient_privilege';
  end if;
  if m.deleted_at is not null then
    raise exception 'That message was deleted.' using errcode = 'check_violation';
  end if;
  if public.is_blocked_between(c.member_a, c.member_b) then
    raise exception 'You can’t react in this conversation.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger message_reactions_guard before insert or update on public.message_reactions
  for each row execute function public.guard_message_reaction();

-- ---------------------------------------------------------------- notification switches
create table public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  messages boolean not null default true,
  calls boolean not null default true,
  replies boolean not null default true,
  likes boolean not null default true,
  follows boolean not null default true,
  mentions boolean not null default true,
  updated_at timestamptz not null default now()
);

commit;
