import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { parseRange } from '../../../utils/audio';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// A voice note's audio. Only the two members of its conversation can play it (and not across a block).
// Supports byte ranges: Safari will not play audio without them, and every browser needs them to seek.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`
    select v.content_type, encode(v.bytes, 'base64') as data
    from public.voice_notes v join public.conversations c on c.id = v.conversation_id
    where v.id = ${id} and (c.member_a = ${profile.id} or c.member_b = ${profile.id})
      and not public.is_blocked_between(c.member_a, c.member_b)`;
  if (!row) throw new HTTPError('Voice message not found', { status: 404 });
  const audio = Buffer.from(row.data as string, 'base64');
  const headers: Record<string, string> = {
    'Content-Type': row.content_type as string,
    'Accept-Ranges': 'bytes',
    // Private: the URL alone is not enough, you must be signed in as one of the two members.
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  const range = parseRange(event.req.headers.get('range'), audio.length);
  if (range === 'unsatisfiable') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${audio.length}` } });
  if (range) {
    const part = audio.subarray(range.start, range.end + 1);
    return new Response(part, { status: 206, headers: { ...headers, 'Content-Range': `bytes ${range.start}-${range.end}/${audio.length}`, 'Content-Length': String(part.length) } });
  }
  return new Response(audio, { headers: { ...headers, 'Content-Length': String(audio.length) } });
});
