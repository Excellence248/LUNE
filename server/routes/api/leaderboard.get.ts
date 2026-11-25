import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../utils/auth';
import { sql } from '../../utils/db';
import { PERIODS, periodOf, pointsReady } from '../../utils/points';

// The top 50 members by Moon points. ?period=week | month | all (default all). Signed in, the reply also
// says where you stand ("me"), even when you are outside the top 50.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  if (!(await pointsReady())) return { available: false, items: [], me: null };
  const period = periodOf(getQuery(event).period);
  const viewer = await getViewer(event);
  // The period text comes from the fixed PERIODS list, never from the request.
  const ranked = `
    select m.*, rank() over (order by m.points desc)::int as rank
    from public.moon_points(${PERIODS[period]}) m where m.points > 0`;
  const items = await sql.query(`
    select r.rank, r.points, r.posts, r.replies, r.likes_received, r.reposts_received, r.followers, r.referrals,
      p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url
    from (${ranked}) r join public.profiles p on p.id = r.profile_id
    order by r.points desc, p.username limit 50`);
  let me = null;
  if (viewer) {
    const [row] = await sql.query(`select r.rank, r.points from (${ranked}) r where r.profile_id = $1`, [viewer.profile.id]);
    me = row ?? { rank: null, points: 0 };
  }
  return { available: true, period, items, me };
});
