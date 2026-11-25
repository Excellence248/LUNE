-- Up to 10 pictures per post, threads, and communities.
--
-- Pictures: posts.image_urls holds up to 10 uploaded pictures. posts.image_url keeps the first one, so
--   anything that still reads the old single-picture column keeps working.
-- Threads: a thread is a first post plus up to 9 follow-ups by the same author. Follow-ups point at the
--   first post (thread_root_id) and carry their place in the thread (thread_position, 1 to 9).
-- Communities: anyone can create one (up to 5 each), join and leave, and post inside it. A post made in a
--   community belongs to it (posts.community_id) and only members can post there.

begin;

-- ---------------------------------------------------------------- communities
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(btrim(name)) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  rules text not null default '' check (char_length(rules) <= 1000),
  avatar_url text not null default '' check (char_length(avatar_url) <= 500),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index communities_slug_key on public.communities (lower(slug));
create index communities_owner on public.communities (owner_id);
create index communities_recent on public.communities (created_at desc);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);
create index community_members_profile on public.community_members (profile_id);

-- The owner cannot walk out of their own community (they can delete it). Deleting the community removes
-- its members, which is the one time the owner row may go.
create function public.keep_community_owner() returns trigger language plpgsql as $$
begin
  if old.role = 'owner' and exists (select 1 from public.communities c where c.id = old.community_id) then
    raise exception 'The owner can’t leave their community. Delete it instead.' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;
create trigger community_members_keep_owner before delete on public.community_members
  for each row execute function public.keep_community_owner();

-- Names reserved for someone else (see reserved_names) cannot be used for a community either.
create function public.guard_community_names() returns trigger language plpgsql as $$
declare
  r public.reserved_names;
begin
  select * into r from public.reserved_names
  where normalized in (public.normalize_name(new.slug), public.normalize_name(new.name)) and owner_id is distinct from new.owner_id limit 1;
  if found then
    raise exception 'That name is already taken.' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;
create trigger communities_guard_names before insert or update of slug, name on public.communities
  for each row execute function public.guard_community_names();

-- Creates a community and makes its creator the owner, in one step.
create function public.create_community(owner uuid, new_slug text, new_name text, new_description text, new_rules text, new_avatar text, new_cover text)
returns public.communities language plpgsql as $$
declare
  c public.communities;
begin
  if (select count(*) from public.communities where owner_id = owner) >= 5 then
    raise exception 'You can run up to 5 communities.' using errcode = 'check_violation';
  end if;
  insert into public.communities (slug, name, description, rules, avatar_url, cover_url, owner_id)
  values (lower(new_slug), btrim(new_name), btrim(new_description), btrim(new_rules), coalesce(new_avatar, ''), coalesce(new_cover, ''), owner)
  returning * into c;
  insert into public.community_members (community_id, profile_id, role) values (c.id, owner, 'owner');
  return c;
end;
$$;

-- ---------------------------------------------------------------- posts
create function public.is_media_paths(paths text[]) returns boolean language sql immutable as $$
  select coalesce(bool_and(path ~ '^/api/media/[0-9a-f-]{36}$'), true) from unnest(paths) as path;
$$;

alter table public.posts
  add column image_urls text[] not null default '{}' check (cardinality(image_urls) <= 10 and public.is_media_paths(image_urls)),
  add column thread_root_id uuid references public.posts(id) on delete cascade,
  add column thread_position int not null default 0 check (thread_position between 0 and 9),
  add column community_id uuid references public.communities(id) on delete cascade;
alter table public.posts add constraint posts_thread_shape check ((thread_root_id is null) = (thread_position = 0));
create index posts_thread_idx on public.posts (thread_root_id, thread_position) where thread_root_id is not null;
create index posts_community_idx on public.posts (community_id, created_at desc, id desc) where community_id is not null;

-- A post may now be pictures only.
alter table public.posts drop constraint posts_not_empty;
alter table public.posts add constraint posts_not_empty check (
  btrim(content) <> '' or coalesce(image_url, '') <> '' or cardinality(image_urls) > 0 or post_type is not distinct from 'repost'
);

-- Only members post in a community, and a thread only continues the author's own first post.
create function public.guard_post_placement() returns trigger language plpgsql as $$
begin
  if new.community_id is not null and not exists (
    select 1 from public.community_members m where m.community_id = new.community_id and m.profile_id = new.user_id
  ) then
    raise exception 'Join this community to post in it.' using errcode = 'insufficient_privilege';
  end if;
  if new.thread_root_id is not null and not exists (
    select 1 from public.posts r
    where r.id = new.thread_root_id and r.user_id = new.user_id and r.thread_root_id is null and r.community_id is not distinct from new.community_id
  ) then
    raise exception 'A thread can only continue your own post.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger posts_guard_placement before insert on public.posts
  for each row execute function public.guard_post_placement();

-- Publishes a post, or a whole thread, in one step. parts is a JSON array (1 to 10 items) of
-- { "content": text, "images": [paths] }; the first is the post and the rest follow it in order.
create function public.create_post_thread(author uuid, community uuid, parts jsonb) returns uuid language plpgsql as $$
declare
  root uuid;
  part jsonb;
  slot int := 0;
  pictures text[];
  new_id uuid;
begin
  if jsonb_typeof(parts) <> 'array' or jsonb_array_length(parts) not between 1 and 10 then
    raise exception 'A thread has 1 to 10 posts.' using errcode = 'check_violation';
  end if;
  for part in select value from jsonb_array_elements(parts) loop
    select coalesce(array_agg(picture), '{}') into pictures from jsonb_array_elements_text(coalesce(part -> 'images', '[]'::jsonb)) as picture;
    insert into public.posts (user_id, content, image_url, image_urls, community_id, thread_root_id, thread_position)
    values (author, btrim(coalesce(part ->> 'content', '')), pictures[1], pictures, community, root, slot)
    returning id into new_id;
    if slot = 0 then root := new_id; end if;
    slot := slot + 1;
  end loop;
  return root;
end;
$$;

-- ---------------------------------------------------------------- shared pieces
-- What the app renders for a post: now with a single list of pictures, the size of its thread (on a first
-- post) and the community it was posted in.
create or replace function public.post_json(po public.posts) returns jsonb language sql stable as $$
  select to_jsonb(po) || jsonb_build_object(
    'profiles', (select public.author_json(a) from public.profiles a where a.id = po.user_id),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id)) from public.likes l where l.post_id = po.id), '[]'::jsonb),
    'reposts', coalesce((select jsonb_agg(jsonb_build_object('user_id', r.user_id)) from public.reposts r where r.post_id = po.id), '[]'::jsonb),
    'replies', coalesce((select jsonb_agg(public.reply_json(rp) order by rp.created_at, rp.id) from public.replies rp where rp.post_id = po.id), '[]'::jsonb),
    'images', case
      when cardinality(po.image_urls) > 0 then to_jsonb(po.image_urls)
      when coalesce(po.image_url, '') <> '' then jsonb_build_array(po.image_url)
      else '[]'::jsonb end,
    'thread_count', (select count(*)::int from public.posts t where t.thread_root_id = po.id),
    'community', (select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name) from public.communities c where c.id = po.community_id)
  );
$$;

-- Uploaded pictures count as "in use" when they are in a post's list, a community avatar or cover.
create or replace function public.delete_orphan_media() returns int language sql as $$
  with gone as (
    delete from public.media m
    where m.created_at < now() - interval '1 day'
      and not exists (select 1 from public.posts p where p.image_url = '/api/media/' || m.id or p.image_urls @> array['/api/media/' || m.id::text])
      and not exists (select 1 from public.profiles pr where pr.avatar_url = '/api/media/' || m.id or pr.cover_url = '/api/media/' || m.id)
      and not exists (select 1 from public.communities c where c.avatar_url = '/api/media/' || m.id or c.cover_url = '/api/media/' || m.id)
    returning 1
  )
  select count(*)::int from gone;
$$;

insert into public.permissions (name, description) values ('community.create', 'Create communities');
insert into public.role_permissions (role, permission) values ('member', 'community.create');

alter table public.moderation_events drop constraint if exists moderation_events_surface_check;
alter table public.moderation_events add constraint moderation_events_surface_check
  check (surface in ('post', 'reply', 'bio', 'username', 'display_name', 'message', 'community'));

commit;
