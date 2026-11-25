import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { checkCommunityPicture, communityError, loadCommunity, requireCommunity, slugParam } from '../../../utils/communities';
import { sql } from '../../../utils/db';
import { requireCommunities } from '../../../utils/feed';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';

interface Body { name?: unknown; description?: unknown; rules?: unknown; avatar_url?: unknown; cover_url?: unknown }

// Body: any of { name, description, rules, avatar_url, cover_url }. Only the owner can change a community.
// The web address (slug) never changes, so links keep working.
export default defineHandler(async (event) => {
  await requireCommunities();
  const me = await requirePermission(event, 'profile.edit_own');
  await rateLimit('communityAction', me.id);
  const slug = slugParam(event);
  const community = await requireCommunity(slug, me.id);
  if (community.owner_id !== me.id) throw new HTTPError('Only the owner can change this community.', { status: 403 });
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : community.name as string;
  const description = typeof body.description === 'string' ? body.description.trim() : community.description as string;
  const rules = typeof body.rules === 'string' ? body.rules.trim() : community.rules as string;
  if (name.length < 3 || name.length > 60) throw new HTTPError('Give your community a name of 3 to 60 characters.', { status: 400 });
  if (description.length > 500) throw new HTTPError('The description must be 500 characters or fewer.', { status: 400 });
  if (rules.length > 1000) throw new HTTPError('The rules must be 1,000 characters or fewer.', { status: 400 });
  await enforceCivility(me.id, 'community', `${name}\n${description}\n${rules}`);
  const avatar = body.avatar_url === undefined || body.avatar_url === community.avatar_url ? community.avatar_url as string : await checkCommunityPicture(body.avatar_url, me.id, 'picture');
  const cover = body.cover_url === undefined || body.cover_url === community.cover_url ? community.cover_url as string : await checkCommunityPicture(body.cover_url, me.id, 'cover picture');
  try {
    await sql`update public.communities set name = ${name}, description = ${description}, rules = ${rules}, avatar_url = ${avatar}, cover_url = ${cover} where id = ${community.id}`;
  } catch (error) {
    return communityError(error);
  }
  return await loadCommunity(slug, me.id);
});
