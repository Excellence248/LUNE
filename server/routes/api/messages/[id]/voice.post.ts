import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { MAX_VOICE_BYTES, MAX_VOICE_MS, MIN_VOICE_MS, parsePeaks, sniffAudio } from '../../../../utils/audio';
import { requirePermission } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';

// Body: the raw recording (WebM, Ogg or MP4 audio, up to 3 MB). Headers: X-Duration-Ms (500 to 120000)
// and X-Peaks (optional, up to 64 comma-separated loudness values from 0 to 100, for the waveform).
// Sends it as a private voice message from the caller to member :id and returns the message. Needs the
// message.send permission and is refused when either member has blocked the other. Voice notes are not
// text, so the hate-speech filter cannot read them: members report them like any other message.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'message.send');
  await rateLimit('voice', me.id);
  const to = uuidParam(getRouterParam(event, 'id'));
  if (to === me.id) throw new HTTPError('You can’t message yourself.', { status: 400 });
  const duration = Number(event.req.headers.get('x-duration-ms'));
  if (!Number.isInteger(duration) || duration < MIN_VOICE_MS || duration > MAX_VOICE_MS) {
    throw new HTTPError('Voice messages must be between half a second and 2 minutes.', { status: 400 });
  }
  const bytes = new Uint8Array(await event.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_VOICE_BYTES) throw new HTTPError('That recording is too large. Keep voice messages under 2 minutes.', { status: 413 });
  const type = sniffAudio(bytes);
  if (!type) throw new HTTPError('That recording is not a supported audio file.', { status: 415 });
  const peaks = parsePeaks(event.req.headers.get('x-peaks'));
  try {
    const [row] = await sql`
      select m.id, m.sender_id, m.kind, m.content, m.created_at, m.read_at, m.voice_id, v.duration_ms, v.peaks
      from public.send_voice_message(${me.id}, ${to}, ${type}, ${'\\x' + Buffer.from(bytes).toString('hex')}::bytea, ${duration}, ${JSON.stringify(peaks)}::jsonb) m
      join public.voice_notes v on v.id = m.voice_id`;
    return row;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Raised by the database when either member has blocked the other.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
    throw error;
  }
});
