import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { requireViewer } from '../../../../../utils/auth';
import { communityError, requireCommunity, slugParam } from '../../../../../utils/communities';
import { sql } from '../../../../../utils/db';
import { requireCommunities } from '../../../../../utils/feed';
import { rateLimit } from '../../../../../utils/limits';

// The owner removes a member.
export default defineHandler(async (event) => {
  await requireCommunities();
  const { profile } = await requireViewer(event);
  await rateLimit('communityAction', profile.id);
  const community = await requireCommunity(slugParam(event), profile.id);
  if (community.owner_id !== profile.id) throw new HTTPError('Only the owner can remove members.', { status: 403 });
  const target = getRouterParam(event, 'id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(target)) throw new HTTPError('Member not found', { status: 404 });
  try {
    await sql`delete from public.community_members where community_id = ${community.id} and profile_id = ${target}`;
  } catch (error) {
    return communityError(error);
  }
  return { ok: true };
});
