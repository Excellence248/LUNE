import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { pointsReady } from '../../../utils/points';

// The people who joined through your invite link, newest first, and whether each has posted yet (a
// friend counts for points once they post).
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  if (!(await pointsReady())) return { available: false, items: [] };
  const items = await sql`
    select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url, r.created_at as joined_at,
      exists (select 1 from public.posts po where po.user_id = p.id) as active
    from public.referrals r join public.profiles p on p.id = r.referred_id
    where r.referrer_id = ${profile.id}
    order by r.created_at desc limit 200`;
  return { available: true, items };
});
