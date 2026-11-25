import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';

// Body: { content }. Edits your own post's text within 15 minutes of posting; it then shows as "edited".
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.create');
  await rateLimit('post', me.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  const { content } = ((await readBody<{ content?: unknown }>(event)) ?? {}) as { content?: unknown };
  const text = typeof content === 'string' ? content.trim() : '';
  if (text.length > 2000) throw new HTTPError('Posts must be 2,000 characters or fewer.', { status: 400 });
  const [ready] = await sql`select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'edited_at') as ok`;
  if (!ready?.ok) throw new HTTPError('Editing posts isn’t available yet.', { status: 503 });
  const [post] = await sql`select user_id, image_url, created_at from public.posts where id = ${id}`;
  if (!post) throw new HTTPError('This post no longer exists.', { status: 404 });
  if (post.user_id !== me.id) throw new HTTPError('You can only edit your own posts.', { status: 403 });
  if (!text && !post.image_url) throw new HTTPError('Write something, or delete the post instead.', { status: 400 });
  if (text) await enforceCivility(me.id, 'post', text);
  try {
    await sql`update public.posts set content = ${text} where id = ${id}`;
  } catch (error) {
    if ((error as { code?: string }).code === '23514') throw new HTTPError((error as Error).message.includes('15 minutes') ? 'Posts can only be edited in the first 15 minutes.' : 'That edit isn’t allowed.', { status: 400 });
    throw error;
  }
  const [row] = await sql`select public.post_json(po) as post from public.posts po where po.id = ${id}`;
  return row.post;
});
