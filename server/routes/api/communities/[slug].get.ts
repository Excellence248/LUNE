import { defineHandler } from 'nitro';
import { getViewer } from '../../../utils/auth';
import { requireCommunity, slugParam } from '../../../utils/communities';
import { requireCommunities } from '../../../utils/feed';

// One community: its details, member count, owner, and the caller's role in it (null if not a member).
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  await requireCommunities();
  const viewer = await getViewer(event);
  return await requireCommunity(slugParam(event), viewer?.profile.id ?? null);
});
