import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { PAGE_SIZE, listParams, paged } from '../../../utils/admin';
import { sql } from '../../../utils/db';

export default defineHandler(async (event) => {
  await requirePermission(event, 'audit.read');
  const { offset } = listParams(event);
  const rows = await sql`
    select a.id, a.action, a.reason, a.details, a.created_at, a.target_id,
      a.admin_id, ap.username as admin_username,
      a.target_profile_id, tp.username as target_username
    from public.admin_actions a
    left join public.profiles ap on ap.id = a.admin_id
    left join public.profiles tp on tp.id = a.target_profile_id
    order by a.created_at desc, a.id desc
    limit ${PAGE_SIZE + 1} offset ${offset}`;
  return paged(rows);
});
