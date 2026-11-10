import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { sql } from '../../../utils/db';

// Newest posts with authors, likes, reposts and replies. ?limit= (1–500, default 50).
export default defineHandler(async (event) => {
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 50, 1), 500);
  const rows = await sql`select public.post_json(po) as post from public.posts po order by po.created_at desc, po.id desc limit ${limit + 1}`;
  event.res.headers.set('Cache-Control', 'no-store');
  return { items: rows.slice(0, limit).map(row => row.post), hasMore: rows.length > limit };
});
