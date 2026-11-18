import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../../utils/auth';
import { rateLimit } from '../../../../utils/limits';
import { sql } from '../../../../utils/db';
import { boundedJson, spaceParam } from '../../../../utils/spaces';

interface Body { event?: unknown; to?: unknown; payload?: unknown }

// Body: { event: 'signal' | 'control', to?: memberId, payload }. Only the host may send control messages.
export default defineHandler(async (event) => {
  const space = spaceParam(event);
  const { profile } = await requireAdultViewer(event);
  await rateLimit('spaceSend', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  if (body.event !== 'signal' && body.event !== 'control') throw new HTTPError('Unknown event', { status: 400 });
  const to = typeof body.to === 'string' && /^[0-9a-f-]{36}$/i.test(body.to) ? body.to : null;
  if (body.event === 'control') {
    const [host] = await sql`select 1 from public.spaces_live where space_id = ${space} and host_id = ${profile.id}`;
    if (!host) throw new HTTPError('Only the host can do that.', { status: 403 });
    // Record promotions before the message goes out, so the member's next poll is already allowed to speak.
    const type = (body.payload as { type?: unknown } | null)?.type;
    if (to && (type === 'promote' || type === 'demote')) {
      await sql`
        update public.space_members set meta = meta || jsonb_build_object('promoted', ${type === 'promote'}::boolean)
        where space_id = ${space} and member_id = ${to}`;
    }
  }
  await sql`
    insert into public.space_signals (space_id, from_id, to_id, event, payload)
    values (${space}, ${profile.id}, ${to}, ${body.event}, ${boundedJson(body.payload)}::jsonb)`;
  return { ok: true };
});
