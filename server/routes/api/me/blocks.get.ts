import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// IDs of the members the caller has blocked.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const rows = await sql`select blocked_id from public.blocks where blocker_id = ${profile.id}`;
  return rows.map(row => row.blocked_id as string);
});
