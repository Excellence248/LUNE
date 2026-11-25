import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';
import { nameOf, pushTo } from '../../../../utils/push';
import { replyThreadsReady } from '../../../../utils/replies';

// Likes or unlikes (toggles) a reply. Returns { active, count }.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.react');
  await rateLimit('react', me.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  if (!(await replyThreadsReady())) throw new HTTPError('Liking replies isn’t available yet.', { status: 503 });
  const [reply] = await sql`select user_id, post_id, left(content, 80) as snippet from public.replies where id = ${id}`;
  if (!reply) throw new HTTPError('This reply no longer exists.', { status: 404 });
  let active: boolean;
  try {
    const removed = await sql`delete from public.reply_likes where reply_id = ${id} and user_id = ${me.id} returning reply_id`;
    active = !removed.length;
    if (active) {
      await sql`insert into public.reply_likes (reply_id, user_id) values (${id}, ${me.id}) on conflict do nothing`;
      if (reply.user_id !== me.id) {
        const { name } = await nameOf(me.id);
        await pushTo(reply.user_id as string, { title: `${name} liked your reply`, body: reply.snippet as string, url: `/post/${reply.post_id}`, tag: `reply-like:${id}`, category: 'likes' });
      }
    }
  } catch (error) {
    if ((error as { code?: string }).code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    throw error;
  }
  const [{ count }] = await sql`select count(*)::int as count from public.reply_likes where reply_id = ${id}`;
  return { active, count };
});
