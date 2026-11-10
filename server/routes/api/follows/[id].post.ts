import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Body: { active: boolean } — true to follow the profile :id, false to unfollow.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'profile.follow');
  const target = uuidParam(getRouterParam(event, 'id'));
  const { active } = ((await readBody<{ active?: unknown }>(event)) ?? {}) as { active?: unknown };
  if (typeof active !== 'boolean') throw new HTTPError('Send { active: true | false }', { status: 400 });
  if (target === me.id) throw new HTTPError('You cannot follow yourself.', { status: 400 });
  try {
    if (active) await sql`insert into public.follows (follower_id, following_id) values (${me.id}, ${target}) on conflict do nothing`;
    else await sql`delete from public.follows where follower_id = ${me.id} and following_id = ${target}`;
  } catch (error) {
    if ((error as { code?: string }).code === '23503') throw new HTTPError('That member no longer exists.', { status: 404 });
    throw error;
  }
  return { active };
});
