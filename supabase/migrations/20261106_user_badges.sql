-- Verification badges (blue / gold). Run once in the Supabase SQL editor.
create table if not exists public.user_badges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('blue', 'gold')),
  expires_at timestamptz,            -- null = never expires (e.g. founder badge)
  granted_at timestamptz not null default now()
);

alter table public.user_badges enable row level security;

-- Everyone can see who is verified...
drop policy if exists "badges are public" on public.user_badges;
create policy "badges are public" on public.user_badges for select using (true);
-- ...but there are deliberately NO insert/update/delete policies: badges can only be
-- granted from the SQL editor or a server-side function (e.g. a payment webhook using the service-role key).

-- Founder: gold tick for the account with username 'sammy'
insert into public.user_badges (user_id, tier)
select id, 'gold' from public.profiles where lower(username) = 'sammy'
on conflict (user_id) do update set tier = 'gold', expires_at = null;
