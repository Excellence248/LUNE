import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../../utils/auth';
import { callParam } from '../../../../utils/calls';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';
import { boundedJson } from '../../../../utils/spaces';

// Body: { kind: 'offer' | 'answer' | 'candidate', payload }. Passes a WebRTC connection message to the
// other member of the call. The server picks the recipient and stamps the sender, so neither can be faked.
export default defineHandler(async (event) => {
  const { profile } = await requireAdultViewer(event);
  await rateLimit('callSignal', profile.id);
  const id = callParam(event);
  const { kind, payload } = ((await readBody<{ kind?: unknown; payload?: unknown }>(event)) ?? {}) as { kind?: unknown; payload?: unknown };
  if (kind !== 'offer' && kind !== 'answer' && kind !== 'candidate') throw new HTTPError('Unknown message.', { status: 400 });
  const json = boundedJson(payload);
  const rows = await sql`
    insert into public.call_signals (call_id, from_id, to_id, kind, payload)
    select c.id, ${profile.id}, case when c.caller_id = ${profile.id} then c.callee_id else c.caller_id end, ${kind}, ${json}::jsonb
    from public.calls c
    where c.id = ${id} and (c.caller_id = ${profile.id} or c.callee_id = ${profile.id}) and c.status <> 'ended'
    returning id`;
  if (!rows.length) throw new HTTPError('This call has ended.', { status: 409 });
  return { ok: true };
});
