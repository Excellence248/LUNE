import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';
import { sql } from '../../../utils/db';

// Body: { content }. Sends a private message from the caller to member :id and returns it. Needs the
// message.send permission (so suspended and unconfirmed-age members are refused), and is refused
// when either member has blocked the other.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'message.send');
  await rateLimit('message', me.id);
  const to = uuidParam(getRouterParam(event, 'id'));
  const { content } = ((await readBody<{ content?: unknown }>(event)) ?? {}) as { content?: unknown };
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 2000) throw new HTTPError('Messages must contain 1–2,000 characters.', { status: 400 });
  if (to === me.id) throw new HTTPError('You can’t message yourself.', { status: 400 });
  await enforceCivility(me.id, 'message', text);
  try {
    const [row] = await sql`select jsonb_build_object('id', m.id, 'sender_id', m.sender_id, 'kind', coalesce(to_jsonb(m) ->> 'kind', 'text'), 'content', m.content, 'created_at', m.created_at, 'read_at', m.read_at) as message
      from public.send_direct_message(${me.id}, ${to}, ${text}) m`;
    return row.message;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Raised by the database when either member has blocked the other.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
    throw error;
  }
});
