import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../utils/auth';
import { sql } from '../../utils/db';
import { feedFeatures } from '../../utils/feed';

// ?q= searches post text (a leading # finds hashtags) and communities. People come from /api/profiles?q=.
// Returns { posts, communities } with up to 30 posts (newest first, first posts only) and 12 communities.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const q = ((getQuery(event) as Record<string, string | undefined>).q ?? '').trim().slice(0, 64);
  if (q.replace(/^[#@]/, '').length < 2) return { posts: [], communities: [] };
  const features = await feedFeatures();
  const viewer = await getViewer(event);
  const me = viewer?.profile.id ?? null;
  const term = q.replace(/^[#@]/, '');
  const like = `%${term.replace(/[\\%_]/g, c => `\\${c}`)}%`;
  // "#solana" must match the whole tag, not "#solanaX".
  const tag = q.startsWith('#') ? `(^|[^A-Za-z0-9_])#${term.replace(/[^A-Za-z0-9_]/g, '')}([^A-Za-z0-9_]|$)` : null;

  const where = ['true'];
  const params: unknown[] = [];
  if (tag) { params.push(tag); where.push(`po.content ~* $${params.length}`); } else { params.push(like); where.push(`po.content ilike $${params.length}`); }
  if (features.threads) where.push('po.thread_root_id is null');
  if (features.communities) where.push('po.community_id is null');
  params.push(me);
  where.push(`not exists (select 1 from public.blocks b where (b.blocker_id = $${params.length}::uuid and b.blocked_id = po.user_id) or (b.blocked_id = $${params.length}::uuid and b.blocker_id = po.user_id))`);
  const posts = await sql.query(`select public.post_json(po) as post from public.posts po where ${where.join(' and ')} order by po.created_at desc limit 30`, params);

  const communities = features.communities ? await sql`
    select c.id, c.slug, c.name, c.description, c.avatar_url, c.cover_url, c.created_at,
      (select count(*)::int from public.community_members m where m.community_id = c.id) as member_count,
      (select m.role from public.community_members m where m.community_id = c.id and m.profile_id = ${me}::uuid) as viewer_role
    from public.communities c
    where c.name ilike ${like} or c.slug ilike ${like} or c.description ilike ${like}
    order by member_count desc limit 12` : [];
  return { posts: posts.map(row => row.post), communities };
});
