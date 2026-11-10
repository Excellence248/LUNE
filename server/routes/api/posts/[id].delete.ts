import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Deletes one of the caller's own posts, with its likes, reposts and replies.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.delete_own');
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`delete from public.posts where id = ${id} and user_id = ${me.id} returning id`;
  if (!row) throw new HTTPError('Post not found', { status: 404 });
  return { ok: true };
});
