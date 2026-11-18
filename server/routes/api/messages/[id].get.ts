import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// The conversation between the caller and member :id, oldest first (the latest 100 messages), plus
// that member's public details. Reading it marks their messages to you as read. Only the two
// participants can ever see it: the lookup is keyed on the caller's own ID.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const other = uuidParam(getRouterParam(event, 'id'));
  const [member] = await sql`
    select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url,
      public.is_blocked_between(${profile.id}, p.id) as blocked
    from public.profiles p where p.id = ${other}`;
  if (!member) throw new HTTPError('Member not found', { status: 404 });
  const [conversation] = await sql`
    select id from public.conversations
    where member_a = least(${profile.id}::uuid, ${other}::uuid) and member_b = greatest(${profile.id}::uuid, ${other}::uuid)`;
  if (!conversation || member.blocked) return { member, messages: [] };
  await sql`
    update public.direct_messages set read_at = now()
    where conversation_id = ${conversation.id} and sender_id = ${other} and read_at is null`;
  const rows = await sql`
    select * from (
      select d.id, d.sender_id, d.kind, d.content, d.created_at, d.read_at, d.voice_id, v.duration_ms, v.peaks
      from public.direct_messages d left join public.voice_notes v on v.id = d.voice_id
      where d.conversation_id = ${conversation.id}
      order by d.created_at desc, d.id desc limit 100
    ) latest order by created_at, id`;
  return { member, messages: rows };
});
