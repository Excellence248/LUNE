import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// IDs of the profiles the caller follows.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const rows = await sql`select following_id from public.follows where follower_id = ${profile.id}`;
  return rows.map(row => row.following_id as string);
});
