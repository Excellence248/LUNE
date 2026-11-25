import { defineHandler } from 'nitro';
import { HTTPError } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { requireCommunity, slugParam } from '../../../utils/communities';
import { sql } from '../../../utils/db';
import { requireCommunities } from '../../../utils/feed';
import { rateLimit } from '../../../utils/limits';

// Deletes a community with its members and its posts. Only the owner can, and it cannot be undone.
export default defineHandler(async (event) => {
  await requireCommunities();
  const { profile } = await requireViewer(event);
  await rateLimit('communityAction', profile.id);
  const community = await requireCommunity(slugParam(event), profile.id);
  if (community.owner_id !== profile.id) throw new HTTPError('Only the owner can delete this community.', { status: 403 });
  await sql`delete from public.communities where id = ${community.id}`;
  return { ok: true };
});
