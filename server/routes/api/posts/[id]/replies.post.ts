import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { isUuid } from '../../../../utils/calls';
import { rateLimit } from '../../../../utils/limits';
import { enforceCivility } from '../../../../utils/moderation';
import { sql } from '../../../../utils/db';
import { nameOf, notifyMentions, notifyPostOwner, pushTo } from '../../../../utils/push';
import { replyThreadsReady } from '../../../../utils/replies';

// Body: { content, parent_id? }. parent_id answers another reply on the same post (like Twitter).
// Returns the new reply with its author.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'reply.create');
  await rateLimit('reply', me.id);
  const post = uuidParam(getRouterParam(event, 'id'));
  const { content, parent_id } = ((await readBody<{ content?: unknown; parent_id?: unknown }>(event)) ?? {}) as { content?: unknown; parent_id?: unknown };
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 1000) throw new HTTPError('Replies must contain 1–1,000 characters.', { status: 400 });
  if (parent_id != null && !isUuid(parent_id)) throw new HTTPError('Invalid reply.', { status: 400 });
  const parent = (parent_id as string | null | undefined) ?? null;
  if (parent && !(await replyThreadsReady())) throw new HTTPError('Replying to replies isn’t available yet.', { status: 503 });
  await enforceCivility(me.id, 'reply', text);
  try {
    const [row] = parent
      ? await sql`
          insert into public.replies (post_id, user_id, content, parent_id) values (${post}, ${me.id}, ${text}, ${parent})
          returning public.reply_json(replies.*) as reply`
      : await sql`
          insert into public.replies (post_id, user_id, content) values (${post}, ${me.id}, ${text})
          returning public.reply_json(replies.*) as reply`;
    await notifyPostOwner(me.id, post, 'reply', text);
    if (parent) {
      // The person you answered hears about it too (unless it is you, or they also own the post and were just told).
      const [answered] = await sql`
        select r.user_id, (po.user_id = r.user_id) as owns_post from public.replies r join public.posts po on po.id = r.post_id where r.id = ${parent}`;
      if (answered && answered.user_id !== me.id && !answered.owns_post) {
        const { name } = await nameOf(me.id);
        await pushTo(answered.user_id as string, { title: `${name} replied to you`, body: text, url: `/post/${post}`, tag: `reply:${parent}`, category: 'replies' });
      }
    }
    await notifyMentions(me.id, text, `/post/${post}`);
    return row.reply;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Raised by the database when either member has blocked the other.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === '23503') throw new HTTPError('This post or reply no longer exists.', { status: 404 });
    if (code === '23514') throw new HTTPError((error as Error).message, { status: 400 });
    throw error;
  }
});
