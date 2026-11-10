import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// The caller's own notifications, newest first (?limit= up to 500), and their unread count.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 50, 1), 500);
  const [rows, [{ unread }]] = await Promise.all([
    sql`
      select n.id, n.user_id, n.actor_id, n.type, n.post_id, n.read, n.created_at,
        jsonb_build_object('username', a.username, 'avatar_url', public.avatar_src(a)) as actor_profile
      from public.notifications n join public.profiles a on a.id = n.actor_id
      where n.user_id = ${profile.id}
      order by n.created_at desc, n.id desc limit ${limit + 1}`,
    sql`select count(*)::int as unread from public.notifications where user_id = ${profile.id} and read = false`,
  ]);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit, unread };
});
