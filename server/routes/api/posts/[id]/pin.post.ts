import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requireViewer } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';

// Pins your own post to the top of your profile, or unpins it if it is already pinned. One pinned post at a time.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await rateLimit('profile', profile.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  const [ready] = await sql`select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'pinned_post_id') as ok`;
  if (!ready?.ok) throw new HTTPError('Pinning posts isn’t available yet.', { status: 503 });
  const [post] = await sql`select user_id from public.posts where id = ${id}`;
  if (!post) throw new HTTPError('This post no longer exists.', { status: 404 });
  if (post.user_id !== profile.id) throw new HTTPError('You can only pin your own posts.', { status: 403 });
  const [{ pinned_post_id: current }] = await sql`select pinned_post_id from public.profiles where id = ${profile.id}`;
  const pinned = current !== id;
  await sql`update public.profiles set pinned_post_id = ${pinned ? id : null} where id = ${profile.id}`;
  return { pinned };
});
