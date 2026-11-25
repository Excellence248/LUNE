import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { MAX_VOICE_BYTES, MAX_VOICE_MS, MIN_VOICE_MS, parsePeaks, sniffAudio } from '../../../../utils/audio';
import { requirePermission } from '../../../../utils/auth';
import { isMissingSchema, isUuid } from '../../../../utils/calls';
import { loadMessage, messageFeatures } from '../../../../utils/messages';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';
import { nameOf, pushTo } from '../../../../utils/push';

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
  // X-Reply-To: the message in this conversation that this voice message answers (optional).
  const replyHeader = event.req.headers.get('x-reply-to');
  if (replyHeader && !isUuid(replyHeader)) throw new HTTPError('Invalid reply.', { status: 400 });
  try {
    const features = await messageFeatures();
    const replying = !!replyHeader && features.replies;
    if (replying) {
      const [found] = await sql`
        select 1 from public.direct_messages t join public.conversations c on c.id = t.conversation_id
        where t.id = ${replyHeader} and c.member_a = least(${me.id}::uuid, ${to}::uuid) and c.member_b = greatest(${me.id}::uuid, ${to}::uuid)`;
      if (!found) throw new HTTPError('The message you are replying to no longer exists.', { status: 404 });
    }
    const [sent] = await sql`
      select m.id from public.send_voice_message(${me.id}, ${to}, ${type}, ${'\\x' + Buffer.from(bytes).toString('hex')}::bytea, ${duration}, ${JSON.stringify(peaks)}::jsonb) m`;
    const id = sent.id as string;
    if (replying) await sql`update public.direct_messages set reply_to_id = ${replyHeader} where id = ${id}`.catch(() => undefined);
    const sender = await nameOf(me.id);
    await pushTo(to, { title: sender.name, body: '🎤 Voice message', url: `/messages/${encodeURIComponent(sender.username)}`, tag: `msg:${me.id}`, category: 'messages' });
    return await loadMessage(id, features);
  } catch (error) {
    if (error instanceof HTTPError) throw error;
    const code = (error as { code?: string }).code;
    // Raised by the database when either member has blocked the other.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
    // The database has not been set up for voice messages yet.
    if (isMissingSchema(error)) throw new HTTPError('Voice messages aren’t available yet. Please try again soon.', { status: 503 });
    throw error;
  }
});
