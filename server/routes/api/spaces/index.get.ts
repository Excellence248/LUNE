import { defineHandler } from 'nitro';
import { sql } from '../../../utils/db';

// Live spaces: those whose host polled in the last 20 seconds.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const rows = await sql`select lobby from public.spaces_live where last_seen > now() - interval '20 seconds' order by last_seen desc limit 50`;
  return rows.map(row => row.lobby);
});
