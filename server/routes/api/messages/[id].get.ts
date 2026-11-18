import { defineHandler } from 'nitro';
import { HTTPError, getQuery, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requireViewer } from '../../../utils/auth';
import { isMissingSchema } from '../../../utils/calls';
import { sql } from '../../../utils/db';
import { forgetMessageFeatures, messageFeatures, messageParts, type MessageFeatures } from '../../../utils/messages';

// The conversation between the caller and member :id, oldest first (the latest 100 messages), plus
// that member's public details and which optional features (voice notes, replies) this database has.
// Reading it marks their messages to you as read and says which ones that was (unreadIds), so the app
// can show "N new messages". With ?peek=1 nothing is marked read: the app uses that to warm up a
// conversation before you open it. Only the two participants can ever see it: the lookup is keyed on
// the caller's own ID.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const other = uuidParam(getRouterParam(event, 'id'));
  const peek = getQuery(event).peek === '1';

  // The two lookups do not depend on each other, so they run together.
  const [[member], [conversation]] = await Promise.all([
    sql`
      select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url,
        public.is_blocked_between(${profile.id}, p.id) as blocked
      from public.profiles p where p.id = ${other}`,
    sql`
      select id from public.conversations
      where member_a = least(${profile.id}::uuid, ${other}::uuid) and member_b = greatest(${profile.id}::uuid, ${other}::uuid)`,
  ]);
  if (!member) throw new HTTPError('Member not found', { status: 404 });

  const load = async (features: MessageFeatures) => {
    const parts = messageParts(features);
    const [rows, marked] = await Promise.all([
      sql.query(`select * from (select ${parts.columns} from public.direct_messages d ${parts.joins} where d.conversation_id = $1 order by d.created_at desc, d.id desc limit 100) latest order by created_at, id`, [conversation.id]),
      peek ? Promise.resolve([]) : sql`
        update public.direct_messages set read_at = now()
        where conversation_id = ${conversation.id} and sender_id = ${other} and read_at is null returning id`,
    ]);
    return { member, messages: rows, features, unreadIds: marked.map(row => row.id as string) };
  };

  let features = await messageFeatures();
  if (!conversation || member.blocked) return { member, messages: [], features, unreadIds: [] };
  try {
    return await load(features);
  } catch (error) {
    // A migration was applied since we last looked: learn what the database has now and try once more.
    if (!isMissingSchema(error)) throw error;
    forgetMessageFeatures();
    features = await messageFeatures();
    return await load(features);
  }
});
