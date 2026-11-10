import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { sql } from '../../../utils/db';

// Public profile with its follower, post, like and repost counts. Guests can read it.
export default defineHandler(async (event) => {
  const username = getRouterParam(event, 'username', { decode: true }) ?? '';
  if (!username || username.length > 64) throw new HTTPError('Profile not found', { status: 404 });
  const [profile] = await sql`
    select p.id, p.username, p.bio, p.avatar_url, p.wallet_address, p.created_at,
      to_jsonb(s) - 'profile_id' as stats,
      b.tier as badge,
      public.is_suspended(p.id) as suspended
    from public.profiles p
    join public.profile_stats s on s.profile_id = p.id
    left join public.user_badges b on b.user_id = p.id and (b.expires_at is null or b.expires_at > now())
    where lower(p.username) = lower(${username})`;
  if (!profile) throw new HTTPError('Profile not found', { status: 404 });
  event.res.headers.set('Cache-Control', 'public, max-age=30');
  return profile;
});
