import { defineHandler } from 'nitro';
import { getRouterParam } from 'nitro/h3';
import { requirePermission } from '../../../../../utils/auth';
import { readAction, runAction, uuidParam } from '../../../../../utils/admin';
import { sql } from '../../../../../utils/db';

// Body: { reason, until? } — no `until` means suspended until reinstated.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'member.suspend');
  const target = uuidParam(getRouterParam(event, 'id'));
  const { reason, until } = await readAction(event);
  const [suspension] = await runAction(() => sql`select * from public.admin_suspend_member(${admin.id}, ${target}, ${reason}, ${until})`);
  return suspension;
});
