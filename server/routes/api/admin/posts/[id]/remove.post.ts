import { defineHandler } from 'nitro';
import { getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { reason }. The removed post is copied into the audit log.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'content.remove_any');
  const post = uuidParam(getRouterParam(event, 'id'));
  const { reason } = await readAction(event);
  await runAction(() => sql`select public.admin_remove_post(${admin.id}, ${post}, ${reason})`);
  return { ok: true };
});
