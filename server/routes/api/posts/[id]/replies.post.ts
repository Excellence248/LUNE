import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { rateLimit } from '../../../../utils/limits';
import { enforceCivility } from '../../../../utils/moderation';
import { sql } from '../../../../utils/db';

// Body: { content }. Returns the new reply with its author.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'reply.create');
  await rateLimit('reply', me.id);
  const post = uuidParam(getRouterParam(event, 'id'));
  const { content } = ((await readBody<{ content?: unknown }>(event)) ?? {}) as { content?: unknown };
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 1000) throw new HTTPError('Replies must contain 1–1,000 characters.', { status: 400 });
  await enforceCivility(me.id, 'reply', text);
  try {
    const [row] = await sql`
      insert into public.replies (post_id, user_id, content) values (${post}, ${me.id}, ${text})
      returning public.reply_json(replies.*) as reply`;
    return row.reply;
  } catch (error) {
    // Raised by the database when either member has blocked the other.
    if ((error as { code?: string }).code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if ((error as { code?: string }).code === '23503') throw new HTTPError('This post no longer exists.', { status: 404 });
    throw error;
  }
});
