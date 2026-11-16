import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// The caller's conversations, most recent first, each with the other member, the last message and how
// many messages from them are still unread. Conversations with a blocked member are left out.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const items = await sql`
    select o.id as user_id, o.username, o.display_name, public.avatar_src(o) as avatar_url,
      lm.content as last_content, lm.sender_id as last_sender_id, lm.created_at as last_at,
      (select count(*)::int from public.direct_messages d
        where d.conversation_id = c.id and d.sender_id <> ${profile.id} and d.read_at is null) as unread
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = ${profile.id} then c.member_b else c.member_a end
    join lateral (
      select d.content, d.sender_id, d.created_at from public.direct_messages d
      where d.conversation_id = c.id order by d.created_at desc, d.id desc limit 1
    ) lm on true
    where (c.member_a = ${profile.id} or c.member_b = ${profile.id}) and not public.is_blocked_between(${profile.id}, o.id)
    order by c.last_message_at desc
    limit 100`;
  return { items, unread: items.reduce((total, row) => total + (row.unread as number), 0) };
});
