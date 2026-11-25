import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { isMissingSchema } from '../../../utils/calls';
import { sql } from '../../../utils/db';

// The caller's conversations, most recent first, each with the other member, the last message and how
// many messages from them are still unread. Conversations with a blocked member are left out.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const me = profile.id;

  const withExtras = () => sql`
    select o.id as user_id, o.username, o.display_name, public.avatar_src(o) as avatar_url,
      case when lm.deleted_at is not null then 'This message was deleted'
           when lm.kind = 'voice' then '🎤 Voice message'
           when lm.kind = 'image' then case when lm.content = '' then '📷 Photo' else '📷 ' || lm.content end
           else lm.content end as last_content, lm.sender_id as last_sender_id, lm.created_at as last_at, (lm.read_at is not null) as last_read,
      (select count(*)::int from public.direct_messages d
        where d.conversation_id = c.id and d.sender_id <> ${me} and d.read_at is null and d.deleted_at is null) as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = ${me} then c.member_b else c.member_a end
    join lateral (
      select d.kind, d.content, d.sender_id, d.created_at, d.read_at, d.deleted_at from public.direct_messages d
      where d.conversation_id = c.id order by d.created_at desc, d.id desc limit 1
    ) lm on true
    where (c.member_a = ${me} or c.member_b = ${me}) and not public.is_blocked_between(${me}, o.id)
    order by c.last_message_at desc
    limit 100`;

  const withVoice = () => sql`
    select o.id as user_id, o.username, o.display_name, public.avatar_src(o) as avatar_url,
      case when lm.kind = 'voice' then '🎤 Voice message' else lm.content end as last_content, lm.sender_id as last_sender_id, lm.created_at as last_at, (lm.read_at is not null) as last_read,
      (select count(*)::int from public.direct_messages d
        where d.conversation_id = c.id and d.sender_id <> ${me} and d.read_at is null) as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = ${me} then c.member_b else c.member_a end
    join lateral (
      select d.kind, d.content, d.sender_id, d.created_at, d.read_at from public.direct_messages d
      where d.conversation_id = c.id order by d.created_at desc, d.id desc limit 1
    ) lm on true
    where (c.member_a = ${me} or c.member_b = ${me}) and not public.is_blocked_between(${me}, o.id)
    order by c.last_message_at desc
    limit 100`;

  // The same list for a database that does not have voice notes yet (its migration is still pending).
  const textOnly = () => sql`
    select o.id as user_id, o.username, o.display_name, public.avatar_src(o) as avatar_url,
      lm.content as last_content, lm.sender_id as last_sender_id, lm.created_at as last_at, (lm.read_at is not null) as last_read,
      (select count(*)::int from public.direct_messages d
        where d.conversation_id = c.id and d.sender_id <> ${me} and d.read_at is null) as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = ${me} then c.member_b else c.member_a end
    join lateral (
      select d.content, d.sender_id, d.created_at, d.read_at from public.direct_messages d
      where d.conversation_id = c.id order by d.created_at desc, d.id desc limit 1
    ) lm on true
    where (c.member_a = ${me} or c.member_b = ${me}) and not public.is_blocked_between(${me}, o.id)
    order by c.last_message_at desc
    limit 100`;

  let items;
  try {
    items = await withExtras();
  } catch (error) {
    if (!isMissingSchema(error)) throw error;
    try {
      items = await withVoice();
    } catch (inner) {
      if (!isMissingSchema(inner)) throw inner;
      items = await textOnly();
    }
  }
  return { items, unread: items.reduce((total, row) => total + (row.unread as number), 0) };
});
