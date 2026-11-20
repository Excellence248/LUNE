import { defineHandler } from 'nitro';
import { requireViewer } from '../../../../utils/auth';
import { communityError, requireCommunity, slugParam } from '../../../../utils/communities';
import { sql } from '../../../../utils/db';
import { requireCommunities } from '../../../../utils/feed';
import { rateLimit } from '../../../../utils/limits';

// Leaves the community. The owner cannot leave (the database refuses); they can delete it instead.
export default defineHandler(async (event) => {
  await requireCommunities();
  const { profile } = await requireViewer(event);
  await rateLimit('communityAction', profile.id);
  const community = await requireCommunity(slugParam(event), profile.id);
  try {
    await sql`delete from public.community_members where community_id = ${community.id} and profile_id = ${profile.id}`;
  } catch (error) {
    return communityError(error);
  }
  return await requireCommunity(community.slug as string, profile.id);
});
