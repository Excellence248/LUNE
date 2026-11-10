import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../utils/auth';
import { rateLimit } from '../../utils/limits';
import { enforceCivility } from '../../utils/moderation';
import { sql } from '../../utils/db';

interface Changes { username?: unknown; bio?: unknown; avatar_url?: unknown }

// Body: any of { username, bio, avatar_url }. avatar_url is an image URL, an uploaded /api/media/… path,
// or an inline data URL (up to ~2 MB, as the profile editor produces).
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'profile.edit_own');
  await rateLimit('profile', me.id);
  const body = ((await readBody<Changes>(event)) ?? {}) as Changes;
  const username = typeof body.username === 'string' ? body.username.trim() : me.username;
  const bio = typeof body.bio === 'string' ? body.bio : me.bio;
  if (!/^[A-Za-z0-9_]{3,64}$/.test(username)) throw new HTTPError('Use 3–64 letters, numbers, or underscores for your username.', { status: 400 });
  if (bio.length > 500) throw new HTTPError('Your bio must be 500 characters or fewer.', { status: 400 });
  if (username !== me.username) await enforceCivility(me.id, 'username', username);
  if (bio !== me.bio) await enforceCivility(me.id, 'bio', bio);
  // The client echoes back the avatar URL it was given; that means "unchanged".
  const avatar = typeof body.avatar_url === 'string' && body.avatar_url !== me.avatar_url ? body.avatar_url : null;
  if (avatar !== null) {
    const allowed = avatar === '' || /^data:image\/(jpeg|png|webp|gif);base64,/.test(avatar) || avatar.startsWith('data:image/svg+xml;utf8,') || /^\/api\/media\/[0-9a-f-]{36}$/.test(avatar) || /^https:\/\//.test(avatar) || /^\/[\w./-]+$/.test(avatar);
    if (!allowed || avatar.length > 3000000) throw new HTTPError('Your avatar must be an image of 2 MB or smaller.', { status: 400 });
  }
  try {
    const [profile] = await sql`
      update public.profiles p set username = ${username}, bio = ${bio}, avatar_url = coalesce(${avatar}, p.avatar_url)
      where p.id = ${me.id}
      returning p.id, p.username, p.bio, public.avatar_src(p) as avatar_url, p.wallet_address`;
    return profile;
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new HTTPError('That username is already taken. Please choose another.', { status: 409 });
    throw error;
  }
});
