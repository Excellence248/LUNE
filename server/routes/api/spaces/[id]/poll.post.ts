import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../../utils/auth';
import { rateLimit } from '../../../../utils/limits';
import { sql } from '../../../../utils/db';
import { boundedJson, spaceParam } from '../../../../utils/spaces';

interface Body { meta?: Record<string, unknown>; lobby?: Record<string, unknown>; after?: unknown }

/*
 * One round trip of a space: record that the caller is present (with their meta), and return who is
 * present plus any connection messages addressed to them since `after`. Browsers call this about
 * once a second. The server stamps the caller's id and decides who is host, so neither can be faked.
 */
export default defineHandler(async (event) => {
  const space = spaceParam(event);
  const { profile } = await requireAdultViewer(event);
  await rateLimit('spacePoll', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const after = Number.isSafeInteger(body.after) ? (body.after as number) : 0;
  const wantsHost = body.meta?.role === 'host';

  let isHost = false;
  if (wantsHost) {
    // The first live host keeps the room; a host gone for 30 seconds can be replaced.
    const [row] = await sql`
      insert into public.spaces_live (space_id, host_id, lobby) values (${space}, ${profile.id}, ${boundedJson(body.lobby ?? {})}::jsonb)
      on conflict (space_id) do update set host_id = excluded.host_id, lobby = excluded.lobby, last_seen = now()
        where spaces_live.host_id = excluded.host_id or spaces_live.last_seen < now() - interval '30 seconds'
      returning host_id`;
    isHost = row?.host_id === profile.id;
    if (!isHost) throw new HTTPError('Someone else is hosting this space.', { status: 409 });
  }
  const meta = { ...(body.meta ?? {}), id: profile.id, role: isHost ? 'host' : body.meta?.role === 'speaker' ? 'speaker' : 'listener' };
  await sql`
    insert into public.space_members (space_id, member_id, meta) values (${space}, ${profile.id}, ${boundedJson(meta, 4000)}::jsonb)
    on conflict (space_id, member_id) do update set meta = excluded.meta, last_seen = now()`;
  if (Math.random() < 0.05) await sql`delete from public.space_signals where created_at < now() - interval '2 minutes'`;

  const [members, signals] = await Promise.all([
    sql`select meta from public.space_members where space_id = ${space} and last_seen > now() - interval '10 seconds'`,
    sql`
      select id, from_id, to_id, event, payload from public.space_signals
      where space_id = ${space} and id > ${after} and from_id <> ${profile.id} and (to_id is null or to_id = ${profile.id})
      order by id limit 200`,
  ]);
  const [{ last }] = await sql`select coalesce(max(id), 0)::bigint as last from public.space_signals where space_id = ${space}`;
  return { me: profile.id, members: members.map(row => row.meta), signals, last: Math.max(after, Number(last)) };
});
