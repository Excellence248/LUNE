import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { callError, getCall, isUuid } from '../../../utils/calls';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { nameOf, pushTo } from '../../../utils/push';

// Body: { to: memberId, kind: 'audio' | 'video' }. Starts ringing that member and returns the call.
// Needs call.start (so suspended and unconfirmed-age members are refused), and is refused when either
// side has blocked the other or is already on a call.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'call.start');
  await rateLimit('call', me.id);
  const { to, kind } = ((await readBody<{ to?: unknown; kind?: unknown }>(event)) ?? {}) as { to?: unknown; kind?: unknown };
  if (!isUuid(to) || (kind !== 'audio' && kind !== 'video')) throw new HTTPError('Invalid call.', { status: 400 });
  try {
    const [started] = await sql`select id from public.start_call(${me.id}, ${to}, ${kind})`;
    const caller = await nameOf(me.id);
    await pushTo(to as string, { title: `${caller.name} is calling`, body: kind === 'video' ? 'Incoming video call' : 'Incoming voice call', url: `/messages/${encodeURIComponent(caller.username)}`, tag: `call:${started.id}`, urgent: true });
    return await getCall(started.id as string, me.id);
  } catch (error) {
    return callError(error);
  }
});
