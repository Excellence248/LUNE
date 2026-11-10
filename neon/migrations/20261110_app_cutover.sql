-- Lune cutover from Supabase: everything the app needs to run on Neon alone.
-- Run after 20261110_profile_stats_and_roles.sql.

begin;

-- Uploaded images (post images and avatars), served by /api/media/:id.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  bytes bytea not null check (octet_length(bytes) between 1 and 5242880),
  created_at timestamptz not null default now()
);
create index media_owner_idx on public.media (owner_id, created_at desc);

-- Wallet sign-in nonces already used, so a signed sign-in message cannot be replayed.
create table public.wallet_nonces (
  nonce text primary key,
  used_at timestamptz not null default now()
);

-- Email of the member's old Supabase account. A Neon Auth account with the same *verified* email
-- reclaims that profile on first sign-in (see ensure_email_profile).
alter table public.profile_accounts add column legacy_email text;
create unique index profile_accounts_legacy_email_key on public.profile_accounts (lower(legacy_email)) where legacy_email is not null;

-- Resolves the profile for a Neon Auth user, reclaiming a legacy profile or creating a new one.
create function public.ensure_email_profile(auth_user uuid, email text, email_verified boolean)
returns public.profiles language plpgsql as $$
declare
  p public.profiles;
  claimed uuid;
  new_id uuid := gen_random_uuid();
begin
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

-- Resolves (or creates) the profile for a wallet whose signature the server has verified.
create function public.ensure_wallet_profile(wallet text) returns public.profiles language plpgsql as $$
declare
  p public.profiles;
  new_id uuid := gen_random_uuid();
begin
  select * into p from public.profiles where wallet_address = wallet;
  if found then
    return p;
  end if;
  insert into public.profiles (id, username, wallet_address)
  values (new_id, 'user_' || replace(new_id::text, '-', ''), wallet)
  on conflict (wallet_address) do nothing
  returning * into p;
  if p.id is null then
    select * into p from public.profiles where wallet_address = wallet;
  end if;
  return p;
end;
$$;

-- Spaces (live audio). Browsers exchange WebRTC connection messages through these tables by polling.
-- Rows are short-lived: members disappear after ~10 seconds without a poll, signals after 2 minutes.
create table public.spaces_live (
  space_id text primary key check (space_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  host_id uuid not null references public.profiles(id) on delete cascade,
  lobby jsonb not null, -- title, host name and avatar, start time, listener count
  last_seen timestamptz not null default now()
);
create index spaces_live_recent_idx on public.spaces_live (last_seen desc);

create table public.space_members (
  space_id text not null,
  member_id uuid not null references public.profiles(id) on delete cascade,
  meta jsonb not null,
  last_seen timestamptz not null default now(),
  primary key (space_id, member_id)
);

create table public.space_signals (
  id bigint generated always as identity primary key,
  space_id text not null,
  from_id uuid not null,
  to_id uuid, -- null = everyone in the space
  event text not null check (event in ('signal', 'control')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index space_signals_poll_idx on public.space_signals (space_id, id);
create index space_signals_age_idx on public.space_signals (created_at);

commit;
