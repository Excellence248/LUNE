import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { rateLimit } from '../../../utils/limits';
import { messageFeatures } from '../../../utils/messages';

// A copy of the caller's own data as a JSON download: profile, posts, replies, who they follow, who they
// blocked, and their private messages (text only; pictures and voice notes are listed, not included).
// Nothing about anyone else is included beyond the username of the other person in a conversation.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await rateLimit('export', profile.id);
  const me = profile.id;
  const features = await messageFeatures();
  const text = features.deletes ? "case when m.deleted_at is null then m.content else '' end" : 'm.content';

  const [[account], posts, replies, following, followers, blocked, messages] = await Promise.all([
    sql`select username, display_name, bio, wallet_address, created_at from public.profiles where id = ${me}`,
    sql`select id, content, image_url, created_at from public.posts where user_id = ${me} order by created_at desc limit 5000`,
    sql`select id, post_id, content, created_at from public.replies where user_id = ${me} order by created_at desc limit 5000`,
    sql`select p.username, f.created_at from public.follows f join public.profiles p on p.id = f.following_id where f.follower_id = ${me} order by f.created_at desc`,
    sql`select p.username, f.created_at from public.follows f join public.profiles p on p.id = f.follower_id where f.following_id = ${me} order by f.created_at desc`,
    sql`select p.username, b.created_at from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = ${me}`,
    sql.query(
      `select o.username as with_username, (m.sender_id = $1) as sent_by_you, m.kind, ${text} as content, m.created_at
       from public.direct_messages m
       join public.conversations c on c.id = m.conversation_id
       join public.profiles o on o.id = case when c.member_a = $1 then c.member_b else c.member_a end
       where c.member_a = $1 or c.member_b = $1
       order by m.created_at desc limit 20000`, [me]),
  ]);

  const body = JSON.stringify({ exported_at: new Date().toISOString(), profile: account, posts, replies, following, followers, blocked, messages }, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="lune-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});
