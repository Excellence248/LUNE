import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// The signed-in admin and their effective permissions. 401/403 tell the panel which screen to show.
export default defineHandler(async (event) => {
  const admin = await requirePermission(event, 'admin.panel');
  const rows = await sql`
    select rp.permission from public.role_permissions rp
    where rp.role = 'member' or rp.role in (select role from public.profile_roles where profile_id = ${admin.id})
    order by 1`;
  return { ...admin, permissions: rows.map(row => row.permission as string) };
});
