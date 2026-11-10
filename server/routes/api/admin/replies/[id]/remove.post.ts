import { defineHandler } from 'nitro';
import { getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { reason }. The removed reply is copied into the audit log.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'content.remove_any');
  const reply = uuidParam(getRouterParam(event, 'id'));
  const { reason } = await readAction(event);
  await runAction(() => sql`select public.admin_remove_reply(${admin.id}, ${reply}, ${reason})`);
  return { ok: true };
});
