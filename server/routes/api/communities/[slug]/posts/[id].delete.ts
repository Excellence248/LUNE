import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { requireViewer } from '../../../../../utils/auth';
import { requireCommunity, slugParam } from '../../../../../utils/communities';
import { sql } from '../../../../../utils/db';
import { requireCommunities } from '../../../../../utils/feed';
import { rateLimit } from '../../../../../utils/limits';

// The owner takes a post (and any thread that follows it) out of their community.
export default defineHandler(async (event) => {
  await requireCommunities();
  const { profile } = await requireViewer(event);
  await rateLimit('communityAction', profile.id);
  const community = await requireCommunity(slugParam(event), profile.id);
  if (community.owner_id !== profile.id) throw new HTTPError('Only the owner can remove posts here.', { status: 403 });
  const id = getRouterParam(event, 'id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HTTPError('Post not found', { status: 404 });
  await sql`delete from public.posts where community_id = ${community.id} and (id = ${id} or thread_root_id = ${id})`;
  return { ok: true };
});
