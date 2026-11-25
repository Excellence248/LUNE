import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { sql } from '../../../utils/db';
import { withFeedFeatures } from '../../../utils/feed';

// Newest posts with authors, likes, reposts and replies. ?limit= (1–500, default 50). The home feed shows
// first posts only: the follow-ups of a thread open from their first post, and posts made inside a
// community stay in that community.
export default defineHandler(async (event) => {
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 50, 1), 500);
  const rows = await withFeedFeatures(features => {
    const where = [features.threads && 'po.thread_root_id is null', features.communities && 'po.community_id is null'].filter(Boolean).join(' and ');
    return sql.query(`select public.post_json(po) as post from public.posts po ${where ? `where ${where}` : ''} order by po.created_at desc, po.id desc limit $1`, [limit + 1]);
  });
  event.res.headers.set('Cache-Control', 'no-store');
  return { items: rows.slice(0, limit).map(row => row.post), hasMore: rows.length > limit };
});
