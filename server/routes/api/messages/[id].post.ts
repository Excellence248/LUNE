import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { isUuid } from '../../../utils/calls';
import { rateLimit } from '../../../utils/limits';
import { loadMessage, messageFeatures } from '../../../utils/messages';
import { enforceCivility } from '../../../utils/moderation';
import { sql } from '../../../utils/db';
import { nameOf, pushTo } from '../../../utils/push';

// Body: { content, reply_to? }. Sends a private message from the caller to member :id and returns it.
// reply_to is the ID of a message in this same conversation that this one answers (when the database
// supports replies). Needs the message.send permission (so suspended and unconfirmed-age members are
// refused), and is refused when either member has blocked the other.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'message.send');
  await rateLimit('message', me.id);
  const to = uuidParam(getRouterParam(event, 'id'));
  const { content, reply_to } = ((await readBody<{ content?: unknown; reply_to?: unknown }>(event)) ?? {}) as { content?: unknown; reply_to?: unknown };
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 2000) throw new HTTPError('Messages must contain 1–2,000 characters.', { status: 400 });
  if (to === me.id) throw new HTTPError('You can’t message yourself.', { status: 400 });
  if (reply_to != null && !isUuid(reply_to)) throw new HTTPError('Invalid reply.', { status: 400 });
  const replyTo = (reply_to as string | null | undefined) ?? null;
  const features = await messageFeatures();
  if (replyTo) {
    if (!features.replies) throw new HTTPError('Replies aren’t available yet.', { status: 400 });
    const [found] = await sql`
      select 1 from public.direct_messages t join public.conversations c on c.id = t.conversation_id
      where t.id = ${replyTo} and c.member_a = least(${me.id}::uuid, ${to}::uuid) and c.member_b = greatest(${me.id}::uuid, ${to}::uuid)`;
    if (!found) throw new HTTPError('The message you are replying to no longer exists.', { status: 404 });
  }
  await enforceCivility(me.id, 'message', text);
  try {
    const [sent] = await sql`select m.id from public.send_direct_message(${me.id}, ${to}, ${text}) m`;
    const id = sent.id as string;
    if (replyTo) {
      // The database also checks the target is in this conversation. If linking fails the message is
      // still delivered, just without the quote.
      await sql`update public.direct_messages set reply_to_id = ${replyTo} where id = ${id}`.catch(() => undefined);
    }
    const sender = await nameOf(me.id);
    await pushTo(to, { title: sender.name, body: text, url: `/messages/${encodeURIComponent(sender.username)}`, tag: `msg:${me.id}`, category: 'messages' });
    return await loadMessage(id, features);
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Raised by the database when either member has blocked the other.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === 'P0002') throw new HTTPError('That member no longer exists.', { status: 404 });
    throw error;
  }
});
