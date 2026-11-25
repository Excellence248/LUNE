import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { getQuery } from 'nitro/h3';
import { sql } from '../../../utils/db';

// IDs of the members the caller has blocked. With ?details=1, the members themselves instead
// (id, username, display_name, avatar_url), most recently blocked first.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  if (getQuery(event).details === '1') {
    return await sql`
      select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url
      from public.blocks b join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = ${profile.id} order by b.created_at desc`;
  }
  const rows = await sql`select blocked_id from public.blocks where blocker_id = ${profile.id}`;
  return rows.map(row => row.blocked_id as string);
});
