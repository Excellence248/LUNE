-- Lune profile stats and role-based access control. Run after 20261110_initial_schema.sql.
--
-- Roles: every profile is a member (post, reply, like, repost, follow, edit their own profile).
-- Admins additionally run the admin panel. Roles are granted only by SQL as the database owner;
-- no API changes profile_roles, so the admin list cannot be widened from the app or the panel.
--
-- Server code checks has_permission() before acting. The admin_* functions check it again
-- and write the audit log, so call them instead of changing the tables directly.

begin;

-- Public profile counts, computed from the source tables so they never drift.
create view public.profile_stats as
select
  p.id as profile_id,
  (select count(*) from public.follows f where f.following_id = p.id)::int as followers,
  (select count(*) from public.follows f where f.follower_id = p.id)::int as following,
  (select count(*) from public.posts po where po.user_id = p.id)::int as posts,
  (select count(*) from public.replies r where r.user_id = p.id)::int as replies,
  (select count(*) from public.reposts rp where rp.user_id = p.id)::int as reposts,
  (select count(*) from public.likes l where l.user_id = p.id)::int as likes_given,
  (select count(*) from public.likes l join public.posts po on po.id = l.post_id where po.user_id = p.id)::int as likes_received,
  (select count(*) from public.reposts rp join public.posts po on po.id = rp.post_id where po.user_id = p.id)::int as reposts_received
from public.profiles p;

create table public.roles (
  name text primary key,
  description text not null
);
insert into public.roles (name, description) values
  ('member', 'Every profile. Posts, replies, reacts, follows and edits their own profile.'),
  ('admin', 'Runs the admin panel: removes content, suspends members and grants badges.');

create table public.permissions (
  name text primary key,
  description text not null
);
insert into public.permissions (name, description) values
  ('profile.edit_own', 'Edit your own username, bio and avatar'),
  ('post.create', 'Publish posts'),
  ('post.delete_own', 'Delete your own posts'),
  ('reply.create', 'Reply to posts'),
  ('reply.delete_own', 'Delete your own replies'),
  ('post.react', 'Like and repost posts'),
  ('profile.follow', 'Follow and unfollow members'),
  ('admin.panel', 'Open the admin panel and see private member details'),
  ('content.remove_any', 'Remove any post or reply'),
  ('member.suspend', 'Suspend and reinstate members'),
  ('badge.grant', 'Grant and revoke verification badges'),
  ('audit.read', 'Read the admin audit log');

-- Admins inherit every member permission (see has_permission), so only extras are listed for them.
create table public.role_permissions (
  role text not null references public.roles(name) on delete cascade,
  permission text not null references public.permissions(name) on delete cascade,
  primary key (role, permission)
);
insert into public.role_permissions (role, permission)
select 'member', name from public.permissions
where name in ('profile.edit_own', 'post.create', 'post.delete_own', 'reply.create', 'reply.delete_own', 'post.react', 'profile.follow');
insert into public.role_permissions (role, permission)
select 'admin', name from public.permissions
where name in ('admin.panel', 'content.remove_any', 'member.suspend', 'badge.grant', 'audit.read');

-- Roles beyond member. No row means the profile is only a member.
create table public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null references public.roles(name) check (role <> 'member'),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

-- Founding admins, by the profile IDs they have in Supabase (kept on import). Granted as soon as the
-- profile row exists. This is safe only because profile IDs are generated server-side: never accept
-- a client-supplied profile ID on signup.
create table public.role_bootstrap (
  profile_id uuid primary key,
  role text not null references public.roles(name) check (role <> 'member'),
  note text not null
);
insert into public.role_bootstrap (profile_id, role, note) values
  ('2b4a3834-f524-4458-9066-500d638069de', 'admin', 'Excellence@248'),
  ('cfaa2613-87d9-4327-aee5-71720ca9e138', 'admin', 'Sammy');

create function public.apply_role_bootstrap() returns trigger language plpgsql as $$
begin
  insert into public.profile_roles (profile_id, role)
  select new.id, b.role from public.role_bootstrap b where b.profile_id = new.id
  on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_role_bootstrap after insert on public.profiles
  for each row execute function public.apply_role_bootstrap();
insert into public.profile_roles (profile_id, role)
select b.profile_id, b.role from public.role_bootstrap b join public.profiles p on p.id = b.profile_id
on conflict do nothing;

-- A suspended member keeps read access but loses every permission until reinstated or expired.
create table public.profile_suspensions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (btrim(reason) <> '' and char_length(reason) <= 500),
  suspended_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz, -- null = until reinstated
  lifted_at timestamptz,
  lifted_by uuid references public.profiles(id) on delete set null,
  check (expires_at > created_at)
);
create unique index profile_suspensions_open_key on public.profile_suspensions (profile_id) where lifted_at is null;

create function public.is_suspended(profile uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from public.profile_suspensions s
    where s.profile_id = profile and s.lifted_at is null and (s.expires_at is null or s.expires_at > now())
  );
$$;

create function public.has_permission(actor uuid, perm text) returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = actor)
    and not public.is_suspended(actor)
    and exists (
      select 1 from public.role_permissions rp
      where rp.permission = perm
        and (rp.role = 'member' or rp.role in (select pr.role from public.profile_roles pr where pr.profile_id = actor))
    );
$$;

create function public.require_permission(actor uuid, perm text) returns void language plpgsql as $$
begin
  if not public.has_permission(actor, perm) then
    raise exception 'Not allowed: %', perm using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Backstop for API bugs: suspended members cannot post, reply, react or follow.
create function public.block_suspended_writes() returns trigger language plpgsql as $$
declare
  actor uuid;
begin
  if current_setting('lune.importing', true) = 'on' then
    return new;
  end if;
  if tg_table_name = 'follows' then
    actor := new.follower_id;
  else
    actor := new.user_id;
  end if;
  if public.is_suspended(actor) then
    raise exception 'This account is suspended.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger posts_block_suspended before insert on public.posts
  for each row execute function public.block_suspended_writes();
create trigger replies_block_suspended before insert on public.replies
  for each row execute function public.block_suspended_writes();
create trigger likes_block_suspended before insert on public.likes
  for each row execute function public.block_suspended_writes();
create trigger reposts_block_suspended before insert on public.reposts
  for each row execute function public.block_suspended_writes();
create trigger follows_block_suspended before insert on public.follows
  for each row execute function public.block_suspended_writes();

-- Append-only record of every admin action. No foreign keys, so it outlives what it describes.
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null check (action in ('suspend', 'reinstate', 'remove_post', 'remove_reply', 'grant_badge', 'revoke_badge')),
  target_profile_id uuid,
  target_id uuid,
  reason text not null check (btrim(reason) <> '' and char_length(reason) <= 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_recent_idx on public.admin_actions (created_at desc, id desc);
create index admin_actions_target_idx on public.admin_actions (target_profile_id, created_at desc);

create function public.forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
create trigger admin_actions_append_only before update or delete on public.admin_actions
  for each row execute function public.forbid_change();

create function public.admin_suspend_member(admin uuid, target uuid, why text, until timestamptz default null)
returns public.profile_suspensions language plpgsql as $$
declare
  s public.profile_suspensions;
begin
  perform public.require_permission(admin, 'member.suspend');
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'Member not found' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.profile_roles where profile_id = target and role = 'admin') then
    raise exception 'Admins cannot be suspended' using errcode = 'insufficient_privilege';
  end if;
  -- Close an expired suspension so the one-open-suspension index allows a new one.
  update public.profile_suspensions set lifted_at = expires_at
  where profile_id = target and lifted_at is null and expires_at <= now();
  insert into public.profile_suspensions (profile_id, reason, suspended_by, expires_at)
  values (target, why, admin, until) returning * into s;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason, details)
  values (admin, 'suspend', target, s.id, why, jsonb_build_object('expires_at', until));
  return s;
end;
$$;

create function public.admin_reinstate_member(admin uuid, target uuid, why text)
returns public.profile_suspensions language plpgsql as $$
declare
  s public.profile_suspensions;
begin
  perform public.require_permission(admin, 'member.suspend');
  update public.profile_suspensions set lifted_at = now(), lifted_by = admin
  where profile_id = target and lifted_at is null and (expires_at is null or expires_at > now())
  returning * into s;
  if s.id is null then
    raise exception 'Member is not suspended' using errcode = 'no_data_found';
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason)
  values (admin, 'reinstate', target, s.id, why);
  return s;
end;
$$;

-- Removed content is copied into the audit log so a removal can be reviewed or appealed.
create function public.admin_remove_post(admin uuid, post uuid, why text) returns void language plpgsql as $$
declare
  p public.posts;
begin
  perform public.require_permission(admin, 'content.remove_any');
  delete from public.posts where id = post returning * into p;
  if p.id is null then
    raise exception 'Post not found' using errcode = 'no_data_found';
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason, details)
  values (admin, 'remove_post', p.user_id, p.id, why,
    jsonb_build_object('content', p.content, 'image_url', p.image_url, 'created_at', p.created_at));
end;
$$;

create function public.admin_remove_reply(admin uuid, reply uuid, why text) returns void language plpgsql as $$
declare
  r public.replies;
begin
  perform public.require_permission(admin, 'content.remove_any');
  delete from public.replies where id = reply returning * into r;
  if r.id is null then
    raise exception 'Reply not found' using errcode = 'no_data_found';
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason, details)
  values (admin, 'remove_reply', r.user_id, r.id, why,
    jsonb_build_object('post_id', r.post_id, 'content', r.content, 'created_at', r.created_at));
end;
$$;

-- tier null revokes the badge.
create function public.admin_set_badge(admin uuid, target uuid, new_tier text, until timestamptz, why text)
returns void language plpgsql as $$
begin
  perform public.require_permission(admin, 'badge.grant');
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'Member not found' using errcode = 'no_data_found';
  end if;
  if new_tier is null then
    delete from public.user_badges where user_id = target;
    if not found then
      raise exception 'Member has no badge' using errcode = 'no_data_found';
    end if;
  else
    insert into public.user_badges (user_id, tier, expires_at) values (target, new_tier, until)
    on conflict (user_id) do update set tier = excluded.tier, expires_at = excluded.expires_at, granted_at = now();
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, reason, details)
  values (admin, case when new_tier is null then 'revoke_badge' else 'grant_badge' end, target, why,
    jsonb_build_object('tier', new_tier, 'expires_at', until));
end;
$$;

commit;
