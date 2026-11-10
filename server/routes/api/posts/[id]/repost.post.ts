import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';

// Body: { active?: boolean } — true to repost, false to undo, omitted to toggle. Returns the new state.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.react');
  const post = uuidParam(getRouterParam(event, 'id'));
  const body = ((await readBody<{ active?: unknown }>(event)) ?? {}) as { active?: unknown };
  if (body.active !== undefined && typeof body.active !== 'boolean') throw new HTTPError('Send { active: true | false }', { status: 400 });
  const active = typeof body.active === 'boolean' ? body.active : !(await sql`select 1 from public.reposts where post_id = ${post} and user_id = ${me.id}`).length;
  try {
    if (active) await sql`insert into public.reposts (post_id, user_id) values (${post}, ${me.id}) on conflict do nothing`;
    else await sql`delete from public.reposts where post_id = ${post} and user_id = ${me.id}`;
  } catch (error) {
    if ((error as { code?: string }).code === '23503') throw new HTTPError('This post no longer exists.', { status: 404 });
    throw error;
  }
  return { active };
});
