import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { feedFeatures } from '../../../utils/feed';

// Communities, biggest first. ?q= searches names and addresses, ?mine=1 lists the ones the caller is in,
// ?limit= up to 60. Without the database support yet it answers { available: false }.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  if (!(await feedFeatures()).communities) return { available: false, items: [] };
  const query = getQuery(event) as Record<string, string | undefined>;
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 60);
  const q = (query.q ?? '').trim().slice(0, 60);
  const viewer = await getViewer(event);
  const me = viewer?.profile.id ?? null;
  const like = `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`;
  const items = await sql`
    select c.id, c.slug, c.name, c.description, c.avatar_url, c.cover_url, c.created_at,
      (select count(*)::int from public.community_members m where m.community_id = c.id) as member_count,
      (select m.role from public.community_members m where m.community_id = c.id and m.profile_id = ${me}::uuid) as viewer_role
    from public.communities c
    where (${q} = '' or c.name ilike ${like} or c.slug ilike ${like} or c.description ilike ${like})
      and (${query.mine === '1'} = false or exists (select 1 from public.community_members m where m.community_id = c.id and m.profile_id = ${me}::uuid))
    order by member_count desc, c.created_at desc
    limit ${limit}`;
  return { available: true, items };
});
