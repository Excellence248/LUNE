-- Member safety: blocks, reports, rate limits, upload quota and account deletion.
-- Run after 20261110_legacy_rows.sql.

begin;

-- New member permissions. Suspended members lose them like every other permission.
insert into public.permissions (name, description) values
  ('report.create', 'Report posts, replies and profiles to the admins');
insert into public.role_permissions (role, permission) values ('member', 'report.create');

-- Blocking works both ways: neither member can follow, reply to, like or repost the other.
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id, blocker_id);

create function public.is_blocked_between(a uuid, b uuid) returns boolean language sql stable as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create function public.block_blocked_interactions() returns trigger language plpgsql as $$
declare
  actor uuid;
  owner uuid;
begin
  if current_setting('lune.importing', true) = 'on' then
    return new;
  end if;
  if tg_table_name = 'follows' then
    actor := new.follower_id;
    owner := new.following_id;
  else
    actor := new.user_id;
    select user_id into owner from public.posts where id = new.post_id;
  end if;
  if owner is not null and owner <> actor and public.is_blocked_between(actor, owner) then
    raise exception 'You can’t interact with this account.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger follows_block_blocked before insert on public.follows
  for each row execute function public.block_blocked_interactions();
create trigger likes_block_blocked before insert on public.likes
  for each row execute function public.block_blocked_interactions();
create trigger reposts_block_blocked before insert on public.reposts
  for each row execute function public.block_blocked_interactions();
create trigger replies_block_blocked before insert on public.replies
  for each row execute function public.block_blocked_interactions();

-- A new block ends any follow between the two members.
create function public.unfollow_on_block() returns trigger language plpgsql as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;
create trigger blocks_unfollow after insert on public.blocks
  for each row execute function public.unfollow_on_block();

-- Reports for the admins. target_id has no foreign key, so a report outlives removed content.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post', 'reply', 'profile')),
  target_id uuid not null,
  target_profile_id uuid, -- the reported member: the profile itself, or the content's author
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'violence', 'sexual', 'scam', 'impersonation', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid,
  resolved_at timestamptz,
  check ((status = 'open') = (resolved_at is null))
);
-- One open report per member per target.
create unique index reports_open_key on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index reports_queue_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id) where status = 'open';

alter table public.admin_actions drop constraint admin_actions_action_check;
alter table public.admin_actions add constraint admin_actions_action_check
  check (action in ('suspend', 'reinstate', 'remove_post', 'remove_reply', 'grant_badge', 'revoke_badge', 'resolve_report', 'dismiss_report'));

create function public.admin_review_report(admin uuid, report uuid, outcome text, why text) returns void language plpgsql as $$
declare
  r public.reports;
begin
  perform public.require_permission(admin, 'content.remove_any');
  if outcome not in ('resolved', 'dismissed') then
    raise exception 'Outcome must be resolved or dismissed' using errcode = 'check_violation';
  end if;
  update public.reports set status = outcome, resolved_by = admin, resolved_at = now()
  where id = report and status = 'open' returning * into r;
  if r.id is null then
    raise exception 'Report not found or already reviewed' using errcode = 'no_data_found';
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason, details)
  values (admin, case outcome when 'resolved' then 'resolve_report' else 'dismiss_report' end, r.target_profile_id, r.id, why,
    jsonb_build_object('target_type', r.target_type, 'target_id', r.target_id, 'reason', r.reason));
end;
$$;

-- Removing content also closes the open reports about it.
create function public.resolve_reports_on_removal() returns trigger language plpgsql as $$
begin
  update public.reports set status = 'resolved', resolved_at = now()
  where target_type = case tg_table_name when 'posts' then 'post' else 'reply' end
    and target_id = old.id and status = 'open';
  return old;
end;
$$;
create trigger posts_resolve_reports after delete on public.posts
  for each row execute function public.resolve_reports_on_removal();
create trigger replies_resolve_reports after delete on public.replies
  for each row execute function public.resolve_reports_on_removal();

-- Fixed-window rate limits. hit_rate_limit returns false once a key is over its limit for the window.
create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (bucket, window_start)
);
create function public.hit_rate_limit(key text, max_hits int, window_seconds int) returns boolean language plpgsql as $$
declare
  started timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  n int;
begin
  insert into public.rate_limits (bucket, window_start) values (key, started)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  return n <= max_hits;
end;
$$;

-- Upload quota and cleanup of images that never ended up in a post or avatar.
alter table public.media add column size int generated always as (octet_length(bytes)) stored;
create index posts_image_idx on public.posts (image_url) where image_url is not null;
create function public.delete_orphan_media() returns int language sql as $$
  with gone as (
    delete from public.media m
    where m.created_at < now() - interval '1 day'
      and not exists (select 1 from public.posts p where p.image_url = '/api/media/' || m.id)
      and not exists (select 1 from public.profiles pr where pr.avatar_url = '/api/media/' || m.id)
    returning 1
  )
  select count(*)::int from gone;
$$;

-- A member deletes their own account: the profile and everything in it, and their Neon Auth sign-in.
-- Admin accounts can only be removed by the database owner.
create function public.delete_own_account(me uuid) returns void language plpgsql as $$
declare
  auth_id uuid;
begin
  if exists (select 1 from public.profile_roles where profile_id = me and role = 'admin') then
    raise exception 'Admin accounts can only be removed by the database owner.' using errcode = 'insufficient_privilege';
  end if;
  select neon_auth_user_id into auth_id from public.profile_accounts where profile_id = me;
  delete from public.profiles where id = me;
  if auth_id is not null then
    delete from neon_auth."user" where id = auth_id;
  end if;
end;
$$;

-- Do not create a profile for a Neon Auth user that no longer exists (a deleted account whose
-- cached session has not expired yet).
create or replace function public.ensure_email_profile(auth_user uuid, email text, email_verified boolean)
returns public.profiles language plpgsql as $$
declare
  p public.profiles;
  claimed uuid;
  new_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from neon_auth."user" where id = auth_user) then
    return null;
  end if;
  select pr.* into p from public.profile_accounts a join public.profiles pr on pr.id = a.profile_id
  where a.neon_auth_user_id = auth_user;
  if found then
    return p;
  end if;
  if email_verified and email is not null then
    update public.profile_accounts set neon_auth_user_id = auth_user, linked_at = now()
    where lower(legacy_email) = lower(email) and neon_auth_user_id is null
    returning profile_id into claimed;
    if claimed is not null then
      select * into p from public.profiles where id = claimed;
      return p;
    end if;
  end if;
  begin
    insert into public.profiles (id, username) values (new_id, 'user_' || replace(new_id::text, '-', '')) returning * into p;
    insert into public.profile_accounts (profile_id, neon_auth_user_id) values (new_id, auth_user);
  exception when unique_violation then
    -- A parallel request created it first.
    select pr.* into p from public.profile_accounts a join public.profiles pr on pr.id = a.profile_id
    where a.neon_auth_user_id = auth_user;
  end;
  return p;
end;
$$;

commit;
