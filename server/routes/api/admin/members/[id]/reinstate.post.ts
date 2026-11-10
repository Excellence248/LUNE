import { defineHandler } from 'nitro';
import { getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { reason }
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'member.suspend');
  const target = uuidParam(getRouterParam(event, 'id'));
  const { reason } = await readAction(event);
  const [suspension] = await runAction(() => sql`select * from public.admin_reinstate_member(${admin.id}, ${target}, ${reason})`);
  return suspension;
});
