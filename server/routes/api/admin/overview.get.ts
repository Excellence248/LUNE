import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

export default defineHandler(async (event) => {
  await requirePermission(event, 'admin.panel');
  const [totals] = await sql`
    select
      (select count(*) from public.profiles)::int as members,
      (select count(*) from public.profiles where created_at > now() - interval '7 days')::int as new_members_7d,
      (select count(*) from public.profile_roles where role = 'admin')::int as admins,
      (select count(*) from public.profile_suspensions where lifted_at is null and (expires_at is null or expires_at > now()))::int as suspended,
      (select count(*) from public.posts)::int as posts,
      (select count(*) from public.posts where created_at > now() - interval '7 days')::int as posts_7d,
      (select count(*) from public.replies)::int as replies,
      (select count(*) from public.likes)::int as likes,
      (select count(*) from public.reposts)::int as reposts,
      (select count(*) from public.follows)::int as follows,
      (select count(*) from public.reports where status = 'open')::int as open_reports`;
  return totals;
});
