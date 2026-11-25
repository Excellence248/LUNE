import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Counts for the admin overview, plus sign-ups per day for the last 14 days. Counts from features whose
// migration has not been applied yet come back as 0.
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
      (select count(*) from public.reports where status = 'open')::int as open_reports,
      (select count(*) from public.direct_messages where created_at > now() - interval '7 days')::int as messages_7d,
      (select count(*) from public.user_badges where expires_at is null or expires_at > now())::int as verified,
      -- Active: posted, replied or sent a message in the last 7 days.
      (select count(*) from (
        select user_id as id from public.posts where created_at > now() - interval '7 days'
        union select user_id from public.replies where created_at > now() - interval '7 days'
        union select sender_id from public.direct_messages where created_at > now() - interval '7 days'
      ) active)::int as active_7d`;

  const optional = async (table: string, query: () => Promise<Record<string, unknown>[]>) => {
    const [ready] = await sql`select to_regclass(${`public.${table}`}) is not null as ok`;
    return ready?.ok ? (await query())[0] : {};
  };
  const [communities, tips, polls, devices] = await Promise.all([
    optional('communities', () => sql`select count(*)::int as communities from public.communities`),
    optional('tips', () => sql`select count(*)::int as tips, coalesce(sum(amount_usdc), 0)::float as tips_usdc from public.tips where status = 'paid'`),
    optional('polls', () => sql`select count(*)::int as polls from public.polls`),
    optional('push_subscriptions', () => sql`select count(*)::int as push_devices from public.push_subscriptions`),
  ]);

  const signups = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, (select count(*) from public.profiles p where p.created_at >= day and p.created_at < day + interval '1 day')::int as count
    from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as day
    order by day`;

  return { communities: 0, tips: 0, tips_usdc: 0, polls: 0, push_devices: 0, ...totals, ...communities, ...tips, ...polls, ...devices, signups };
});
