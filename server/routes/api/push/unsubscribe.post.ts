import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Body: { endpoint }. Stops notifications to that device for the signed-in member.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const { endpoint } = ((await readBody<{ endpoint?: unknown }>(event)) ?? {}) as { endpoint?: unknown };
  if (typeof endpoint !== 'string') throw new HTTPError('Send { endpoint }', { status: 400 });
  await sql`delete from public.push_subscriptions where user_id = ${profile.id} and endpoint = ${endpoint}`;
  return { ok: true };
});
