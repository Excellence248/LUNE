-- Voice notes in direct messages.
--
-- The audio lives in voice_notes (up to 3 MB and 2 minutes each), tied to the conversation, so it can
-- only ever be played by the two members of that conversation. A voice message is a direct_messages row
-- with kind = 'voice' and no text.

begin;

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('audio/webm', 'audio/ogg', 'audio/mp4')),
  bytes bytea not null check (octet_length(bytes) between 1 and 3145728),
  duration_ms int not null check (duration_ms between 500 and 120000),
  -- A few dozen 0-100 loudness values, for drawing the waveform without downloading the audio.
  peaks jsonb not null default '[]'::jsonb check (jsonb_typeof(peaks) = 'array' and jsonb_array_length(peaks) <= 64),
  created_at timestamptz not null default now()
);
create index voice_notes_conversation on public.voice_notes (conversation_id);
create index voice_notes_sender_recent on public.voice_notes (sender_id, created_at desc);

alter table public.direct_messages
  add column kind text not null default 'text' check (kind in ('text', 'voice')),
  add column voice_id uuid references public.voice_notes(id) on delete cascade;

alter table public.direct_messages drop constraint direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_body_check check (
  (kind = 'text' and voice_id is null and btrim(content) <> '' and char_length(content) <= 2000)
  or (kind = 'voice' and voice_id is not null and content = '')
);

-- Sends a voice message, creating the conversation on first contact. One statement, so a refused
-- message (for example a block) leaves neither a conversation nor a stored recording behind.
create function public.send_voice_message(sender uuid, recipient uuid, mime text, audio bytea, length_ms int, wave jsonb)
returns public.direct_messages language plpgsql as $$
declare
  conv uuid;
  note uuid;
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
  insert into public.voice_notes (conversation_id, sender_id, content_type, bytes, duration_ms, peaks)
  values (conv, sender, mime, audio, length_ms, coalesce(wave, '[]'::jsonb)) returning id into note;
  insert into public.direct_messages (conversation_id, sender_id, content, kind, voice_id) values (conv, sender, '', 'voice', note) returning * into m;
  update public.conversations set last_message_at = m.created_at where id = conv;
  return m;
end;
$$;

commit;
