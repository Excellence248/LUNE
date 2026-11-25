-- Invite links and Moon points (for the leaderboard and rewards). Additive.
-- Moon points are a fun score for activity. They have no money value and cannot be bought, sold or paid out.

begin;

-- Who invited whom. A member can be invited once, only in their first week, never by themselves.
create table public.referrals (
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (referred_id <> referrer_id)
);
create index referrals_referrer on public.referrals (referrer_id, created_at desc);

-- Records that inviter_name invited member. Returns true when recorded, false when it does not count
-- (unknown or suspended inviter, inviting yourself, an account older than 7 days, already invited, or
-- the two of you inviting each other).
create function public.claim_referral(member uuid, inviter_name text) returns boolean language plpgsql as $$
declare
  inviter uuid;
begin
  select p.id into inviter from public.profiles p where lower(p.username) = lower(btrim(inviter_name));
  if inviter is null or inviter = member or public.is_suspended(inviter) then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = member and p.created_at > now() - interval '7 days') then return false; end if;
  if exists (select 1 from public.referrals r where r.referred_id = inviter and r.referrer_id = member) then return false; end if;
  insert into public.referrals (referred_id, referrer_id) values (member, inviter) on conflict (referred_id) do nothing;
  return found;
end;
$$;

-- Moon points earned since a moment (use '-infinity' for all time), for every member who earned any.
--   post 5 · reply 2 · like received 1 · repost received 2 · new follower 3 · invited friend who posted 20
-- Suspended members are left out. Likes and follows from yourself cannot happen, so they cannot be farmed that way.
create function public.moon_points(since timestamptz)
returns table (profile_id uuid, posts int, replies int, likes_received int, reposts_received int, followers int, referrals int, points int)
language sql stable as $$
  with
  p as (select user_id as id, count(*)::int as n from public.posts where created_at >= since group by user_id),
  r as (select user_id as id, count(*)::int as n from public.replies where created_at >= since group by user_id),
  l as (select po.user_id as id, count(*)::int as n from public.likes x join public.posts po on po.id = x.post_id where x.created_at >= since group by po.user_id),
  rp as (select po.user_id as id, count(*)::int as n from public.reposts x join public.posts po on po.id = x.post_id where x.created_at >= since group by po.user_id),
  f as (select following_id as id, count(*)::int as n from public.follows where created_at >= since group by following_id),
  rf as (
    select x.referrer_id as id, count(*)::int as n from public.referrals x
    where x.created_at >= since and exists (select 1 from public.posts po where po.user_id = x.referred_id)
    group by x.referrer_id
  ),
  everyone as (select id from p union select id from r union select id from l union select id from rp union select id from f union select id from rf)
  select e.id,
    coalesce(p.n, 0), coalesce(r.n, 0), coalesce(l.n, 0), coalesce(rp.n, 0), coalesce(f.n, 0), coalesce(rf.n, 0),
    coalesce(p.n, 0) * 5 + coalesce(r.n, 0) * 2 + coalesce(l.n, 0) + coalesce(rp.n, 0) * 2 + coalesce(f.n, 0) * 3 + coalesce(rf.n, 0) * 20
  from everyone e
  left join p on p.id = e.id left join r on r.id = e.id left join l on l.id = e.id left join rp on rp.id = e.id
  left join f on f.id = e.id left join rf on rf.id = e.id
  where not public.is_suspended(e.id);
$$;

commit;
