import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// A picture sent in a message. Only the two members of its conversation can open it (and not across a
// block), and not once the sender has deleted the message.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`
    select i.content_type, encode(i.bytes, 'base64') as data
    from public.message_images i join public.conversations c on c.id = i.conversation_id
    where i.id = ${id} and (c.member_a = ${profile.id} or c.member_b = ${profile.id})
      and not public.is_blocked_between(c.member_a, c.member_b)
      and exists (select 1 from public.direct_messages m where m.image_id = i.id and m.deleted_at is null)`;
  if (!row) throw new HTTPError('Picture not found', { status: 404 });
  const bytes = Buffer.from(row.data as string, 'base64');
  return new Response(bytes, {
    headers: {
      'Content-Type': row.content_type as string,
      'Content-Length': String(bytes.length),
      // Private: the URL alone is not enough, you must be signed in as one of the two members.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
});
