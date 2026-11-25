import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Your saved posts, most recently saved first (up to 200). With ?ids=1, just their IDs (for the
// bookmark icons across the app). Only you can see your bookmarks.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const [ready] = await sql`select to_regclass('public.bookmarks') is not null as ok`;
  if (!ready?.ok) return getQuery(event).ids === '1' ? [] : { available: false, items: [] };
  if (getQuery(event).ids === '1') {
    const rows = await sql`select post_id from public.bookmarks where user_id = ${profile.id}`;
    return rows.map(row => row.post_id as string);
  }
  const rows = await sql`
    select public.post_json(po) as post from public.bookmarks b join public.posts po on po.id = b.post_id
    where b.user_id = ${profile.id} and not public.is_blocked_between(${profile.id}, po.user_id)
    order by b.created_at desc limit 200`;
  return { available: true, items: rows.map(row => row.post) };
});
