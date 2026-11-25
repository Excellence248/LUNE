import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { isMissingSchema, isUuid } from '../../../../utils/calls';
import { sql } from '../../../../utils/db';
import { sniffImage } from '../../../../utils/images';
import { rateLimit } from '../../../../utils/limits';
import { loadMessage, messageFeatures } from '../../../../utils/messages';
import { enforceCivility } from '../../../../utils/moderation';
import { nameOf, pushTo } from '../../../../utils/push';

// Vercel caps request bodies at 4.5 MB, so pictures stop at 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;

// Body: the raw picture (JPG, PNG, WebP or GIF, up to 4 MB). Headers: X-Caption (optional, URL-encoded,
// up to 2,000 characters) and X-Reply-To (optional, a message in this conversation).
// Sends it as a private picture message from the caller to member :id and returns the message. Only the
// two members can ever open the picture. The caption goes through the hate-speech filter.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'message.send');
  await rateLimit('chatImage', me.id);
  const to = uuidParam(getRouterParam(event, 'id'));
  if (to === me.id) throw new HTTPError('You can’t message yourself.', { status: 400 });
  const bytes = new Uint8Array(await event.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new HTTPError('Choose a picture up to 4 MB.', { status: 413 });
  const type = sniffImage(bytes);
  if (!type) throw new HTTPError('Choose a JPG, PNG, WebP, or GIF picture.', { status: 415 });
  let caption = '';
  try { caption = decodeURIComponent(event.req.headers.get('x-caption') ?? '').trim(); } catch { throw new HTTPError('Invalid caption.', { status: 400 }); }
  if (caption.length > 2000) throw new HTTPError('Captions must be 2,000 characters or fewer.', { status: 400 });
  const replyHeader = event.req.headers.get('x-reply-to');
  if (replyHeader && !isUuid(replyHeader)) throw new HTTPError('Invalid reply.', { status: 400 });
  if (caption) await enforceCivility(me.id, 'message', caption);
  try {
    const features = await messageFeatures();
    if (!features.images) throw new HTTPError('Pictures in messages aren’t available yet. Please try again soon.', { status: 503 });
    const replying = !!replyHeader && features.replies;
    if (replying) {
      const [found] = await sql`
        select 1 from public.direct_messages t join public.conversations c on c.id = t.conversation_id
        where t.id = ${replyHeader} and c.member_a = least(${me.id}::uuid, ${to}::uuid) and c.member_b = greatest(${me.id}::uuid, ${to}::uuid)`;
      if (!found) throw new HTTPError('The message you are replying to no longer exists.', { status: 404 });
    }
    const [sent] = await sql`select m.id from public.send_image_message(${me.id}, ${to}, ${type}, ${'\\x' + Buffer.from(bytes).toString('hex')}::bytea, ${caption}) m`;
    const id = sent.id as string;
    if (replying) await sql`update public.direct_messages set reply_to_id = ${replyHeader} where id = ${id}`.catch(() => undefined);
    const sender = await nameOf(me.id);
    await pushTo(to, { title: sender.name, body: caption ? `📷 ${caption}` : '📷 Photo', url: `/messages/${encodeURIComponent(sender.username)}`, tag: `msg:${me.id}`, category: 'messages' });
    return await loadMessage(id, features);
  } catch (error) {
    if (error instanceof HTTPError) throw error;
    const code = (error as { code?: string }).code;
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
    if (isMissingSchema(error)) throw new HTTPError('Pictures in messages aren’t available yet. Please try again soon.', { status: 503 });
    throw error;
  }
});
