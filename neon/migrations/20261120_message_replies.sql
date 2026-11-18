-- Replying to a particular message (like WhatsApp and Telegram).
--
-- A message can point at the message it answers. The database only allows a reply to a message in the
-- same conversation, so nobody can quote a message from someone else's chat. If the original is ever
-- removed (its sender or conversation is deleted) the reply stays, just without the quote.

begin;

alter table public.direct_messages
  add column reply_to_id uuid references public.direct_messages(id) on delete set null;
create index direct_messages_reply_to on public.direct_messages (reply_to_id) where reply_to_id is not null;

create function public.guard_reply_target() returns trigger language plpgsql as $$
begin
  if new.reply_to_id is null then
    return new;
  end if;
  if new.reply_to_id = new.id then
    raise exception 'A message can’t reply to itself.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.direct_messages t where t.id = new.reply_to_id and t.conversation_id = new.conversation_id) then
    raise exception 'You can only reply to a message in this conversation.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger direct_messages_guard_reply before insert or update of reply_to_id on public.direct_messages
  for each row execute function public.guard_reply_target();

commit;
