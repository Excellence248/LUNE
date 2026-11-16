import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../utils/auth';
import { rateLimit } from '../../utils/limits';
import { enforceCivility } from '../../utils/moderation';
import { sql } from '../../utils/db';

interface Changes { username?: unknown; display_name?: unknown; bio?: unknown; avatar_url?: unknown; cover_url?: unknown }

// Body: any of { username, display_name, bio, avatar_url, cover_url }.
// - username is the unique @handle; display_name is the free-form name shown as "you" (up to 50 characters).
// - avatar_url is an image URL, an uploaded /api/media/… path, or an inline data URL (up to ~2 MB).
// - cover_url is the profile banner: an uploaded /api/media/… path or an https image URL ('' removes it).
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'profile.edit_own');
  await rateLimit('profile', me.id);
  const body = ((await readBody<Changes>(event)) ?? {}) as Changes;
  const username = typeof body.username === 'string' ? body.username.trim() : me.username;
  const displayName = typeof body.display_name === 'string' ? body.display_name.replace(/\s+/g, ' ').trim() : me.display_name;
  const bio = typeof body.bio === 'string' ? body.bio : me.bio;
  if (!/^[A-Za-z0-9_]{3,64}$/.test(username)) throw new HTTPError('Use 3–64 letters, numbers, or underscores for your username.', { status: 400 });
  if (displayName.length > 50) throw new HTTPError('Your name must be 50 characters or fewer.', { status: 400 });
  if (/[\p{Cc}\p{Bidi_C}]/u.test(displayName)) throw new HTTPError('Your name can’t contain control or text-direction characters.', { status: 400 });
  if (bio.length > 500) throw new HTTPError('Your bio must be 500 characters or fewer.', { status: 400 });
  if (username !== me.username) await enforceCivility(me.id, 'username', username);
  if (displayName !== me.display_name) await enforceCivility(me.id, 'display_name', displayName);
  if (bio !== me.bio) await enforceCivility(me.id, 'bio', bio);
  // The client echoes back the avatar URL it was given; that means "unchanged".
  const avatar = typeof body.avatar_url === 'string' && body.avatar_url !== me.avatar_url ? body.avatar_url : null;
  if (avatar !== null) {
    const allowed = avatar === '' || /^data:image\/(jpeg|png|webp|gif);base64,/.test(avatar) || avatar.startsWith('data:image/svg+xml;utf8,') || /^\/api\/media\/[0-9a-f-]{36}$/.test(avatar) || /^https:\/\//.test(avatar) || /^\/[\w./-]+$/.test(avatar);
    if (!allowed || avatar.length > 3000000) throw new HTTPError('Your avatar must be an image of 2 MB or smaller.', { status: 400 });
  }
  // Same rule for the cover, but only uploads that belong to this member (or an https URL) are accepted.
  const cover = typeof body.cover_url === 'string' && body.cover_url !== me.cover_url ? body.cover_url : null;
  if (cover !== null && cover !== '') {
    const mediaId = /^\/api\/media\/([0-9a-f-]{36})$/.exec(cover)?.[1];
    if (mediaId) {
      const [owned] = await sql`select 1 from public.media where id = ${mediaId} and owner_id = ${me.id}`;
      if (!owned) throw new HTTPError('Upload the cover picture again, then retry.', { status: 400 });
    } else if (!/^https:\/\/[^\s]{1,480}$/.test(cover)) {
      throw new HTTPError('Your cover must be an uploaded image.', { status: 400 });
    }
  }
  try {
    const [profile] = await sql`
      update public.profiles p set username = ${username}, display_name = ${displayName}, bio = ${bio},
        avatar_url = coalesce(${avatar}, p.avatar_url), cover_url = coalesce(${cover}, p.cover_url)
      where p.id = ${me.id}
      returning p.id, p.username, p.display_name, p.bio, public.avatar_src(p) as avatar_url, p.cover_url, p.wallet_address`;
    return profile;
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new HTTPError('That username is already taken. Please choose another.', { status: 409 });
    throw error;
  }
});
