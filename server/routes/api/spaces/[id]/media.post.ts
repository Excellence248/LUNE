import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireAdultViewer } from '../../../../utils/auth';
import { rateLimit } from '../../../../utils/limits';
import { sql } from '../../../../utils/db';
import { iceServers, sfu, spaceParam } from '../../../../utils/spaces';

interface Body { op?: unknown; sdp?: unknown; mid?: unknown; sessions?: unknown; mids?: unknown; mic?: unknown }
interface Media { session: string; mic: boolean }
interface TracksResponse { sessionDescription?: { type: string; sdp: string }; requiresImmediateRenegotiation?: boolean; tracks?: { mid?: string; errorCode?: string }[] }

const TRACK = 'mic';
const sdpOf = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('v=') || value.length > 30000) throw new HTTPError('Invalid session description', { status: 400 });
  return value;
};
const midsOf = (value: unknown) => (Array.isArray(value) ? value : []).filter((m): m is string => typeof m === 'string' && /^[\w-]{1,32}$/.test(m)).slice(0, 64);

/*
 * The member's link to the Cloudflare SFU (see sfu() in utils/spaces.ts). The server holds each member's
 * SFU session in their presence row (`media`), so it alone decides who may send a mic (the host and members
 * the host promoted) and whose mic may be received (only current speakers).
 *   connect  – new SFU session + ICE servers          push   – send my mic (offer → answer)
 *   pull     – receive speakers' mics (→ offer)        answer – finish a pull
 *   close    – stop tracks by mid (mic: true when it is my own mic)
 */
export default defineHandler(async (event) => {
  const space = spaceParam(event);
  const { profile } = await requireAdultViewer(event);
  await rateLimit('spaceMedia', profile.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const [row] = await sql`
    select meta from public.space_members where space_id = ${space} and member_id = ${profile.id} and last_seen > now() - interval '10 seconds'`;
  if (!row) throw new HTTPError('Join the space first.', { status: 409 });
  const meta = row.meta as { role?: string; promoted?: boolean; media?: Media | null };
  const setMedia = (media: Media) => sql`
    update public.space_members set meta = meta || jsonb_build_object('media', ${JSON.stringify(media)}::jsonb)
    where space_id = ${space} and member_id = ${profile.id}`;

  if (body.op === 'connect') {
    const [{ sessionId }, servers] = await Promise.all([sfu<{ sessionId: string }>('POST', '/sessions/new'), iceServers()]);
    await setMedia({ session: sessionId, mic: false });
    return { iceServers: servers };
  }
  const session = meta.media?.session;
  if (!session) throw new HTTPError('Connect to the audio first.', { status: 409 });
  const path = `/sessions/${encodeURIComponent(session)}`;

  switch (body.op) {
    case 'push': {
      if (meta.role !== 'host' && meta.promoted !== true) throw new HTTPError('Only speakers can talk in this space.', { status: 403 });
      const [mid] = midsOf([body.mid]);
      if (!mid) throw new HTTPError('Invalid track', { status: 400 });
      const res = await sfu<TracksResponse>('POST', `${path}/tracks/new`, {
        sessionDescription: { type: 'offer', sdp: sdpOf(body.sdp) }, tracks: [{ location: 'local', mid, trackName: TRACK }],
      });
      if (!res.tracks?.some(t => t.errorCode)) await setMedia({ session, mic: true });
      return res;
    }
    case 'pull': {
      // Only the mics of members who are speaking right now.
      const live = await sql`
        select meta->'media'->>'session' as session from public.space_members
        where space_id = ${space} and last_seen > now() - interval '10 seconds'
          and meta->>'role' in ('host', 'speaker') and meta->'media'->>'mic' = 'true'`;
      const allowed = new Set(live.map(r => r.session as string));
      const wanted = (Array.isArray(body.sessions) ? body.sessions : []).filter((s): s is string => typeof s === 'string' && allowed.has(s) && s !== session).slice(0, 64);
      if (!wanted.length) throw new HTTPError('That speaker is not live.', { status: 404 });
      return sfu<TracksResponse>('POST', `${path}/tracks/new`, { tracks: wanted.map(s => ({ location: 'remote', sessionId: s, trackName: TRACK })) });
    }
    case 'answer':
      return sfu('PUT', `${path}/renegotiate`, { sessionDescription: { type: 'answer', sdp: sdpOf(body.sdp) } });
    case 'close': {
      if (body.mic === true) await setMedia({ session, mic: false });
      const mids = midsOf(body.mids);
      // Forced: the SFU drops the tracks at once and no renegotiation is needed.
      if (mids.length) await sfu('PUT', `${path}/tracks/close`, { tracks: mids.map(mid => ({ mid })), force: true });
      return { ok: true };
    }
  }
  throw new HTTPError('Unknown operation', { status: 400 });
});
