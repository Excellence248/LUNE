import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { outcome: 'resolved' | 'dismissed', reason }. To remove the content itself, use the content routes.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'content.remove_any');
  const report = uuidParam(getRouterParam(event, 'id'));
  const { reason, body: { outcome } } = await readAction(event);
  if (outcome !== 'resolved' && outcome !== 'dismissed') throw new HTTPError('Choose resolved or dismissed', { status: 400 });
  await runAction(() => sql`select public.admin_review_report(${admin.id}, ${report}, ${outcome}, ${reason})`);
  return { ok: true };
});
