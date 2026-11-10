import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { rateLimit } from '../../../../utils/limits';
import { sql } from '../../../../utils/db';

// Body: { active?: boolean } — true to like, false to undo, omitted to toggle. Returns the new state.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.react');
  await rateLimit('react', me.id);
  const post = uuidParam(getRouterParam(event, 'id'));
  const body = ((await readBody<{ active?: unknown }>(event)) ?? {}) as { active?: unknown };
  if (body.active !== undefined && typeof body.active !== 'boolean') throw new HTTPError('Send { active: true | false }', { status: 400 });
  const active = typeof body.active === 'boolean' ? body.active : !(await sql`select 1 from public.likes where post_id = ${post} and user_id = ${me.id}`).length;
  try {
    if (active) await sql`insert into public.likes (post_id, user_id) values (${post}, ${me.id}) on conflict do nothing`;
    else await sql`delete from public.likes where post_id = ${post} and user_id = ${me.id}`;
  } catch (error) {
    // Raised by the database when either member has blocked the other.
    if ((error as { code?: string }).code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if ((error as { code?: string }).code === '23503') throw new HTTPError('This post no longer exists.', { status: 404 });
    throw error;
  }
  return { active };
});
