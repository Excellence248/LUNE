import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';
import { messageFeatures } from '../../../../utils/messages';
import { nameOf, pushTo } from '../../../../utils/push';

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'];

// Body: { emoji } to react (one per member, a new one replaces the old) or { emoji: null } to remove
// yours. Tapping the same emoji again also removes it. Returns the message's reactions.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'message.send');
  await rateLimit('react', me.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  const { emoji } = ((await readBody<{ emoji?: unknown }>(event)) ?? {}) as { emoji?: unknown };
  if (emoji !== null && (typeof emoji !== 'string' || !REACTIONS.includes(emoji))) throw new HTTPError('Choose one of the offered reactions.', { status: 400 });
  const features = await messageFeatures();
  if (!features.reactions) throw new HTTPError('Reactions aren’t available yet. Please try again soon.', { status: 503 });

  const [message] = await sql`
    select d.sender_id, left(d.content, 60) as snippet, d.kind
    from public.direct_messages d join public.conversations c on c.id = d.conversation_id
    where d.id = ${id} and (c.member_a = ${me.id} or c.member_b = ${me.id})`;
  if (!message) throw new HTTPError('Message not found', { status: 404 });

  try {
    const [existing] = await sql`select emoji from public.message_reactions where message_id = ${id} and user_id = ${me.id}`;
    if (emoji === null || existing?.emoji === emoji) {
      await sql`delete from public.message_reactions where message_id = ${id} and user_id = ${me.id}`;
    } else {
      await sql`
        insert into public.message_reactions (message_id, user_id, emoji) values (${id}, ${me.id}, ${emoji})
        on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now()`;
      if (message.sender_id !== me.id) {
        const who = await nameOf(me.id);
        const what = message.kind === 'voice' ? 'your voice message' : message.kind === 'image' ? 'your photo' : `“${message.snippet}”`;
        await pushTo(message.sender_id as string, { title: who.name, body: `reacted ${emoji} to ${what}`, url: `/messages/${encodeURIComponent(who.username)}`, tag: `react:${id}`, category: 'messages' });
      }
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '42501' || code === '23514') throw new HTTPError((error as Error).message, { status: 403 });
    throw error;
  }
  const reactions = await sql`select emoji, user_id from public.message_reactions where message_id = ${id} order by created_at`;
  return { reactions };
});
