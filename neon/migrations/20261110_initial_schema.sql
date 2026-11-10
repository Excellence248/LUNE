-- Lune initial Neon schema. Run once against an empty public schema (see docs/neon-migration.md).
-- Everything runs in one transaction: either every table is created or none is.
--
-- Access model: the app connects with the server-side DATABASE_URL (database owner), so RLS is not
-- used. Ownership and recipient checks belong in the server routes, with parameterized queries.
--
-- Importing from Supabase: run `set lune.importing = 'on';` in the import session so the notification
-- triggers below do not create duplicate notifications for imported likes, reposts, replies and follows.

begin;

-- Keeps updated_at current on rows that track it.
create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Public profiles. Email addresses are never stored here.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null check (username ~ '^[A-Za-z0-9_]{3,64}$'),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text not null default '' check (char_length(avatar_url) <= 3000000), -- URL or legacy data URL
  wallet_address text unique check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Usernames are unique regardless of case, so "Sammy" cannot impersonate "sammy".
create unique index profiles_username_lower_key on public.profiles (lower(username));
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Private: which sign-in identities own which profile. One row per profile, and each identity maps
-- to at most one profile. Link only after verifying ownership server-side, never from client input.
-- neon_auth_user_id is neon_auth."user".id; there is no foreign key because Neon manages that schema.
create table public.profile_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  neon_auth_user_id uuid unique,
  supabase_user_id uuid unique,
  linked_at timestamptz not null default now(),
  check (neon_auth_user_id is not null or supabase_user_id is not null)
);

-- Private: onboarding state, currently kept in browser localStorage by src/lib/onboarding.ts.
create table public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  interests text[] not null default '{}',
  onboarding_done boolean not null default false,
  checklist_dismissed boolean not null default false,
  posted_first boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger profile_preferences_set_updated_at before update on public.profile_preferences
  for each row execute function public.set_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 2000),
  image_url text,
  created_at timestamptz not null default now(),
  -- Legacy repost columns, kept so imported rows survive intact.
  post_type text check (post_type in ('post', 'repost')),
  repost_content text,
  repost_username text,
  original_post_id uuid references public.posts(id) on delete set null,
  -- "is not distinct from": post_type is null on normal posts, and a null check result would pass.
  constraint posts_not_empty check (btrim(content) <> '' or coalesce(image_url, '') <> '' or post_type is not distinct from 'repost')
);
create index posts_feed_idx on public.posts (created_at desc, id desc);
create index posts_author_idx on public.posts (user_id, created_at desc, id desc);
create index posts_original_idx on public.posts (original_post_id) where original_post_id is not null;

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (btrim(content) <> '' and char_length(content) <= 1000),
  created_at timestamptz not null default now()
);
create index replies_post_idx on public.replies (post_id, created_at, id);
create index replies_author_idx on public.replies (user_id);

-- The primary keys make a second like or repost of the same post impossible.
create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index likes_user_idx on public.likes (user_id, created_at desc);

create table public.reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reposts_user_idx on public.reposts (user_id, created_at desc);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id, follower_id);

-- Private inbox: user_id is the recipient. Follow notifications have no post; the rest must.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'repost', 'reply', 'follow')),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id <> actor_id),
  check ((type = 'follow') = (post_id is null))
);
create index notifications_inbox_idx on public.notifications (user_id, created_at desc, id desc);
create index notifications_unread_idx on public.notifications (user_id) where read = false;
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_post_idx on public.notifications (post_id) where post_id is not null;

-- Notifications are generated here, never by the client. Self-activity is skipped.
create function public.notify_on_activity() returns trigger language plpgsql as $$
declare
  recipient uuid;
begin
  if current_setting('lune.importing', true) = 'on' then
    return new;
  end if;
  if tg_table_name = 'follows' then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
    return new;
  end if;
  select user_id into recipient from public.posts where id = new.post_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (recipient, new.user_id, tg_argv[0], new.post_id);
  end if;
  return new;
end;
$$;
create trigger likes_notify after insert on public.likes
  for each row execute function public.notify_on_activity('like');
create trigger reposts_notify after insert on public.reposts
  for each row execute function public.notify_on_activity('repost');
create trigger replies_notify after insert on public.replies
  for each row execute function public.notify_on_activity('reply');
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_activity('follow');

-- Verification badges. Only trusted server code (payment confirmation, admin SQL) may write these.
create table public.user_badges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('blue', 'gold')),
  expires_at timestamptz, -- null = never expires (e.g. founder badge)
  granted_at timestamptz not null default now()
);

-- USDC-on-Solana premium orders. A transaction signature can pay for only one order,
-- and an order is paid only once it has both a verified signature and a paid timestamp.
create table public.crypto_orders (
  reference text primary key check (reference ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('blue', 'gold')),
  amount_usdc numeric(20, 6) not null check (amount_usdc > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  signature text unique check (signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,100}$'),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check (
    (status = 'pending' and signature is null and paid_at is null)
    or (status = 'paid' and signature is not null and paid_at is not null)
  )
);
create index crypto_orders_user_idx on public.crypto_orders (user_id, created_at desc);
create index crypto_orders_pending_idx on public.crypto_orders (created_at) where status = 'pending';

commit;
