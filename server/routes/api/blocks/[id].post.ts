import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';

// Body: { active: boolean } — block or unblock the profile :id. Blocking also ends follows both ways.
// Allowed even while suspended: protecting yourself is never taken away.
export default defineHandler(async (event) => {
  const { profile: me } = await requireViewer(event);
  await rateLimit('block', me.id);
  const target = uuidParam(getRouterParam(event, 'id'));
  const { active } = ((await readBody<{ active?: unknown }>(event)) ?? {}) as { active?: unknown };
  if (typeof active !== 'boolean') throw new HTTPError('Send { active: true | false }', { status: 400 });
  if (target === me.id) throw new HTTPError('You cannot block yourself.', { status: 400 });
  try {
    if (active) await sql`insert into public.blocks (blocker_id, blocked_id) values (${me.id}, ${target}) on conflict do nothing`;
    else await sql`delete from public.blocks where blocker_id = ${me.id} and blocked_id = ${target}`;
  } catch (error) {
    if ((error as { code?: string }).code === '23503') throw new HTTPError('That member no longer exists.', { status: 404 });
    throw error;
  }
  return { active };
});
