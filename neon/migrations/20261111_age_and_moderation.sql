-- Age confirmation and hate-speech moderation log.
--
-- profile_age is private: no view, function or API returns the birth date. It is written once (the
-- API uses insert ... on conflict do nothing) so a member cannot retry with a different date.
-- moderation_events records only that a post/reply/bio/username was refused and why, never the text.

begin;

create table public.profile_age (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null check (birth_date > date '1900-01-01' and birth_date <= current_date),
  recorded_at timestamptz not null default now()
);

create table public.moderation_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  surface text not null check (surface in ('post', 'reply', 'bio', 'username')),
  category text not null check (category in ('slur', 'hate_phrase')),
  created_at timestamptz not null default now()
);
create index moderation_events_profile_recent on public.moderation_events (profile_id, created_at desc);

commit;
