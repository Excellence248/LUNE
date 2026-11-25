import { defineHandler } from 'nitro';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { feedFeatures } from '../../../utils/feed';
import { levelFor, pointsReady } from '../../../utils/points';

// Your Moon points (this week and all time), your level, your rank, and which achievements you have.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const { profile } = await requireViewer(event);
  if (!(await pointsReady())) return { available: false };
  const me = profile.id;
  const communities = (await feedFeatures()).communities;

  const [[all], [week], [stats], [extras], [referred]] = await Promise.all([
    sql`
      select r.* from (select m.*, rank() over (order by m.points desc)::int as rank from public.moon_points('-infinity') m where m.points > 0) r
      where r.profile_id = ${me}`,
    sql`select points from public.moon_points(now() - interval '7 days') where profile_id = ${me}`,
    sql`select posts, replies, followers, likes_received from public.profile_stats where profile_id = ${me}`,
    sql`
      select (coalesce(p.avatar_url, '') <> '' and coalesce(p.bio, '') <> '' and coalesce(p.display_name, '') <> '') as complete,
        exists (select 1 from public.user_badges b where b.user_id = p.id and (b.expires_at is null or b.expires_at > now())) as verified
      from public.profiles p where p.id = ${me}`,
    sql`
      select count(*)::int as invited,
        count(*) filter (where exists (select 1 from public.posts po where po.user_id = r.referred_id))::int as active
      from public.referrals r where r.referrer_id = ${me}`,
  ]);
  const [community] = communities
    ? await sql`
        select exists (select 1 from public.community_members m where m.profile_id = ${me}) as joined,
          exists (select 1 from public.communities c where c.owner_id = ${me}) as founded`
    : [{ joined: false, founded: false }];

  const points = (all?.points as number) ?? 0;
  const s = { posts: stats?.posts ?? 0, replies: stats?.replies ?? 0, followers: stats?.followers ?? 0, likes: stats?.likes_received ?? 0 };
  const active = referred?.active ?? 0;
  const achievements = [
    { id: 'first_post', name: 'Liftoff', description: 'Share your first post', done: s.posts >= 1 },
    { id: 'posts_25', name: 'Storyteller', description: 'Share 25 posts', done: s.posts >= 25, progress: Math.min(s.posts, 25), goal: 25 },
    { id: 'first_reply', name: 'Say hi', description: 'Reply to someone', done: s.replies >= 1 },
    { id: 'replies_50', name: 'Conversationalist', description: 'Write 50 replies', done: s.replies >= 50, progress: Math.min(s.replies, 50), goal: 50 },
    { id: 'likes_10', name: 'Rising star', description: 'Get 10 likes on your posts', done: s.likes >= 10, progress: Math.min(s.likes, 10), goal: 10 },
    { id: 'likes_100', name: 'Crowd favourite', description: 'Get 100 likes on your posts', done: s.likes >= 100, progress: Math.min(s.likes, 100), goal: 100 },
    { id: 'followers_10', name: 'Orbit', description: 'Reach 10 followers', done: s.followers >= 10, progress: Math.min(s.followers, 10), goal: 10 },
    { id: 'followers_100', name: 'Gravity', description: 'Reach 100 followers', done: s.followers >= 100, progress: Math.min(s.followers, 100), goal: 100 },
    { id: 'community', name: 'Crew member', description: 'Join a community', done: !!community?.joined },
    { id: 'founder', name: 'Founder', description: 'Start a community', done: !!community?.founded },
    { id: 'inviter', name: 'Mission control', description: 'Invite a friend who posts', done: active >= 1 },
    { id: 'ambassador', name: 'Ambassador', description: 'Invite 5 friends who post', done: active >= 5, progress: Math.min(active, 5), goal: 5 },
    { id: 'profile', name: 'All set', description: 'Add a photo, a display name and a bio', done: !!extras?.complete },
    { id: 'verified', name: 'Gold', description: 'Get the gold tick', done: !!extras?.verified },
  ];

  return {
    available: true,
    points,
    week: (week?.points as number) ?? 0,
    rank: (all?.rank as number) ?? null,
    level: levelFor(points),
    breakdown: all ?? { posts: 0, replies: 0, likes_received: 0, reposts_received: 0, followers: 0, referrals: 0 },
    referrals: { invited: referred?.invited ?? 0, active },
    achievements,
  };
});
