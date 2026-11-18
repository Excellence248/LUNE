import { defineHandler } from 'nitro';
import { readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../utils/auth';
import { isUuid } from '../../../utils/calls';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';

interface Body { callId?: unknown; after?: unknown }

/*
 * One round trip of the call machinery, called by every signed-in browser every few seconds, and about
 * once a second while it is on a call.
 *   - With no callId: returns the call this member is in or being rung for (if any). Nothing is touched,
 *     so an idle browser never keeps a call alive.
 *   - With callId (the call this browser is on): records that this side is still here, and returns that
 *     call's latest state (including when it has ended) plus the connection messages sent to this member
 *     after `after`.
 */
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireAdultViewer(event);
  await rateLimit('callPoll', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const callId = isUuid(body.callId) ? body.callId : null;
  const after = Number.isSafeInteger(body.after) && (body.after as number) >= 0 ? (body.after as number) : 0;

  await sql`select public.sweep_calls()`;
  if (callId) {
    await sql`
      update public.calls set
        caller_seen = case when caller_id = ${profile.id} then now() else caller_seen end,
        callee_seen = case when callee_id = ${profile.id} then now() else callee_seen end
      where id = ${callId} and status = 'active'`;
  }
  const [call] = await sql`
    select c.id, c.kind, c.status, c.end_reason, c.caller_id, c.callee_id, c.created_at, c.answered_at, c.ended_at,
      jsonb_build_object('id', o.id, 'username', o.username, 'display_name', o.display_name, 'avatar_url', public.avatar_src(o)) as peer
    from public.calls c
    join public.profiles o on o.id = case when c.caller_id = ${profile.id} then c.callee_id else c.caller_id end
    where (c.caller_id = ${profile.id} or c.callee_id = ${profile.id})
      and (c.id = ${callId}::uuid or c.status <> 'ended')
    order by coalesce(c.id = ${callId}::uuid, false) desc, c.created_at desc
    limit 1`;
  const signals = call && callId && call.id === callId
    ? await sql`select id, from_id, kind, payload from public.call_signals where call_id = ${callId} and to_id = ${profile.id} and id > ${after} order by id limit 100`
    : [];
  if (Math.random() < 0.02) await sql`delete from public.call_signals where created_at < now() - interval '10 minutes'`;
  return { call: call ?? null, signals };
});
