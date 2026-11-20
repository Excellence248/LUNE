import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { SLUG, checkCommunityPicture, communityError, loadCommunity } from '../../../utils/communities';
import { sql } from '../../../utils/db';
import { requireCommunities } from '../../../utils/feed';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';

interface Body { slug?: unknown; name?: unknown; description?: unknown; rules?: unknown; avatar_url?: unknown; cover_url?: unknown }

// Body: { slug, name, description?, rules?, avatar_url?, cover_url? }. Creates a community; the caller
// becomes its owner and first member. Each member can run up to 5.
export default defineHandler(async (event) => {
  await requireCommunities();
  const me = await requirePermission(event, 'community.create');
  await rateLimit('communityCreate', me.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const rules = typeof body.rules === 'string' ? body.rules.trim() : '';
  if (name.length < 3 || name.length > 60) throw new HTTPError('Give your community a name of 3 to 60 characters.', { status: 400 });
  if (!SLUG.test(slug)) throw new HTTPError('The web address must be 3–40 characters: lowercase letters, numbers and dashes.', { status: 400 });
  if (description.length > 500) throw new HTTPError('The description must be 500 characters or fewer.', { status: 400 });
  if (rules.length > 1000) throw new HTTPError('The rules must be 1,000 characters or fewer.', { status: 400 });
  await enforceCivility(me.id, 'community', `${name}\n${slug}\n${description}\n${rules}`);
  const avatar = await checkCommunityPicture(body.avatar_url, me.id, 'picture');
  const cover = await checkCommunityPicture(body.cover_url, me.id, 'cover picture');
  try {
    await sql`select public.create_community(${me.id}, ${slug}, ${name}, ${description}, ${rules}, ${avatar}, ${cover})`;
  } catch (error) {
    return communityError(error);
  }
  return await loadCommunity(slug, me.id);
});
