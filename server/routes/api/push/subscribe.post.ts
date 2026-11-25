import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { isPushEndpoint } from '../../../utils/push';

interface Body { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }

// Body: a browser PushSubscription as JSON. Saves this device for the signed-in member (a device that was
// someone else's moves to the current member). Up to 10 devices each.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await rateLimit('profile', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const { endpoint } = body;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || !isPushEndpoint(endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) {
    throw new HTTPError('That device could not be registered.', { status: 400 });
  }
  await sql`
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (${profile.id}, ${endpoint}, ${p256dh}, ${auth})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`;
  await sql`delete from public.push_subscriptions where user_id = ${profile.id} and id not in (select id from public.push_subscriptions where user_id = ${profile.id} order by created_at desc limit 10)`;
  return { ok: true };
});
