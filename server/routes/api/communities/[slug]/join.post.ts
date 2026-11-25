import { defineHandler } from 'nitro';
import { requireViewer } from '../../../../utils/auth';
import { requireCommunity, slugParam } from '../../../../utils/communities';
import { sql } from '../../../../utils/db';
import { requireCommunities } from '../../../../utils/feed';
import { rateLimit } from '../../../../utils/limits';

// Joins the community (safe to repeat).
export default defineHandler(async (event) => {
  await requireCommunities();
  const { profile } = await requireViewer(event);
  await rateLimit('communityAction', profile.id);
  const community = await requireCommunity(slugParam(event), profile.id);
  await sql`insert into public.community_members (community_id, profile_id) values (${community.id}, ${profile.id}) on conflict do nothing`;
  return await requireCommunity(community.slug as string, profile.id);
});
