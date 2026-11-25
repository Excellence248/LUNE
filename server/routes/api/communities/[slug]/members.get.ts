import { defineHandler } from 'nitro';
import { getViewer } from '../../../../utils/auth';
import { requireCommunity, slugParam } from '../../../../utils/communities';
import { sql } from '../../../../utils/db';
import { requireCommunities } from '../../../../utils/feed';

// Members, owner first then by join date (up to 200).
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  await requireCommunities();
  const viewer = await getViewer(event);
  const community = await requireCommunity(slugParam(event), viewer?.profile.id ?? null);
  const items = await sql`
    select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url, m.role, m.joined_at
    from public.community_members m join public.profiles p on p.id = m.profile_id
    where m.community_id = ${community.id}
    order by (m.role = 'owner') desc, m.joined_at asc limit 200`;
  return { items };
});
