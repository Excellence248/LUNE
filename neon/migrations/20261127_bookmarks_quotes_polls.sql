-- Bookmarks, quote posts and polls. Additive. Run after 20261121_pictures_threads_communities.sql.

begin;

-- ---------------------------------------------------------------- bookmarks (private to each member)
create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index bookmarks_recent on public.bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------- quote posts
-- A post can quote another post. If the quoted post is deleted, the quote stays without the preview.
alter table public.posts add column quote_of uuid references public.posts(id) on delete set null;
create index posts_quote_of on public.posts (quote_of) where quote_of is not null;

create function public.guard_quote() returns trigger language plpgsql as $$
begin
  if new.quote_of is not null then
    if new.quote_of = new.id then
      raise exception 'A post can’t quote itself.' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.posts q where q.id = new.quote_of and public.is_blocked_between(q.user_id, new.user_id)) then
      raise exception 'You can’t quote this account.' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger posts_guard_quote before insert or update of quote_of on public.posts
  for each row execute function public.guard_quote();

-- ---------------------------------------------------------------- polls
-- A post can carry one poll: 2 to 4 options and a closing time (5 minutes to 7 days after posting).
create table public.polls (
  post_id uuid primary key references public.posts(id) on delete cascade,
  options text[] not null check (cardinality(options) between 2 and 4),
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (closes_at > created_at + interval '4 minutes' and closes_at <= created_at + interval '7 days 1 minute')
);

create function public.guard_poll_options() returns trigger language plpgsql as $$
begin
  if exists (select 1 from unnest(new.options) o where char_length(btrim(o)) not between 1 and 80) then
    raise exception 'Each poll option needs 1 to 80 characters.' using errcode = 'check_violation';
  end if;
  if (select count(distinct lower(btrim(o))) from unnest(new.options) o) <> cardinality(new.options) then
    raise exception 'Poll options must be different from each other.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger polls_guard_options before insert or update on public.polls
  for each row execute function public.guard_poll_options();

-- One vote per member per poll, and it can't be changed (like Twitter).
create table public.poll_votes (
  post_id uuid not null references public.polls(post_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option int not null check (option >= 0),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create function public.guard_poll_vote() returns trigger language plpgsql as $$
declare
  p public.polls;
begin
  select * into p from public.polls where post_id = new.post_id;
  if new.option >= cardinality(p.options) then
    raise exception 'That option isn’t in this poll.' using errcode = 'check_violation';
  end if;
  if p.closes_at <= now() then
    raise exception 'This poll has closed.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.posts po where po.id = new.post_id and public.is_blocked_between(po.user_id, new.user_id)) then
    raise exception 'You can’t vote on this poll.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger poll_votes_guard before insert on public.poll_votes
  for each row execute function public.guard_poll_vote();

-- ---------------------------------------------------------------- what the app renders for a post
-- As before, plus the quoted post (a small preview), how often this post was quoted, and its poll with votes.
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
    'community', (select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name) from public.communities c where c.id = po.community_id),
    'quote', (
      select jsonb_build_object(
        'id', q.id, 'user_id', q.user_id, 'content', left(q.content, 600), 'created_at', q.created_at,
        'images', case when cardinality(q.image_urls) > 0 then to_jsonb(q.image_urls) when coalesce(q.image_url, '') <> '' then jsonb_build_array(q.image_url) else '[]'::jsonb end,
        'profiles', (select public.author_json(a) from public.profiles a where a.id = q.user_id))
      from public.posts q where q.id = po.quote_of),
    'quote_count', (select count(*)::int from public.posts qp where qp.quote_of = po.id),
    'poll', (
      select jsonb_build_object(
        'options', to_jsonb(pl.options), 'closes_at', pl.closes_at,
        'votes', coalesce((select jsonb_agg(jsonb_build_object('user_id', v.user_id, 'option', v.option)) from public.poll_votes v where v.post_id = pl.post_id), '[]'::jsonb))
      from public.polls pl where pl.post_id = po.id)
  );
$$;

commit;
