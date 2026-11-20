import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../../../utils/auth';
import { requireCommunity, slugParam } from '../../../../utils/communities';
import { sql } from '../../../../utils/db';
import { feedFeatures, requireCommunities } from '../../../../utils/feed';

// Posts made inside a community, newest first (first posts only; thread follow-ups open from their first post).
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  await requireCommunities();
  const features = await feedFeatures();
  const viewer = await getViewer(event);
  const community = await requireCommunity(slugParam(event), viewer?.profile.id ?? null);
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 50, 1), 200);
  const rows = await sql.query(
    `select public.post_json(po) as post from public.posts po
     where po.community_id = $1 ${features.threads ? 'and po.thread_root_id is null' : ''}
     order by po.created_at desc, po.id desc limit $2`, [community.id, limit + 1]);
  return { items: rows.slice(0, limit).map(row => row.post), hasMore: rows.length > limit };
});
