import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { tier: 'blue' | 'gold' | null, until?, reason } — tier null revokes the badge.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'badge.grant');
  const target = uuidParam(getRouterParam(event, 'id'));
  const { reason, until, tier } = await readAction(event);
  if (tier !== null && tier !== 'blue' && tier !== 'gold') throw new HTTPError('Choose blue, gold, or none', { status: 400 });
  await runAction(() => sql`select public.admin_set_badge(${admin.id}, ${target}, ${tier}, ${until}, ${reason})`);
  return { ok: true };
});
