import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { isMissingSchema } from '../../../utils/calls';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { PUSH_CATEGORIES } from '../../../utils/push';

const ALL_ON = Object.fromEntries(PUSH_CATEGORIES.map(name => [name, true]));

// GET: the caller's notification switches, { messages, calls, replies, likes, follows, mentions } (all on
// until changed). POST: the same keys (any of them) as booleans to change them.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  if (event.req.method === 'POST') {
    await rateLimit('profile', profile.id);
    const body = ((await readBody<Record<string, unknown>>(event)) ?? {}) as Record<string, unknown>;
    const changes = PUSH_CATEGORIES.filter(name => name in body);
    if (!changes.length || changes.some(name => typeof body[name] !== 'boolean')) throw new HTTPError('Send true or false for each switch.', { status: 400 });
    try {
      // Column names come from the fixed list, never from the request.
      const columns = changes.map(name => name).join(', ');
      const values = changes.map((_, index) => `$${index + 2}`).join(', ');
      const updates = changes.map(name => `${name} = excluded.${name}`).join(', ');
      await sql.query(`insert into public.notification_prefs (user_id, ${columns}) values ($1, ${values}) on conflict (user_id) do update set ${updates}, updated_at = now()`, [profile.id, ...changes.map(name => body[name])]);
    } catch (error) {
      if (isMissingSchema(error)) throw new HTTPError('Notification switches aren’t available yet. Please try again soon.', { status: 503 });
      throw error;
    }
  }
  try {
    const [row] = await sql`select messages, calls, replies, likes, follows, mentions from public.notification_prefs where user_id = ${profile.id}`;
    return { available: true, ...ALL_ON, ...(row ?? {}) };
  } catch (error) {
    if (!isMissingSchema(error)) throw error;
    return { available: false, ...ALL_ON };
  }
});
