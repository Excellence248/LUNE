-- Editing a post (within 15 minutes, shown as "edited") and pinning one post to the top of your profile. Additive.

begin;

alter table public.posts add column edited_at timestamptz;

-- The post's text can only change within 15 minutes of posting, and only by its author (the API checks
-- the author; this is the backstop for the time window and for keeping the record honest).
create function public.guard_post_edit() returns trigger language plpgsql as $$
begin
  if new.content is distinct from old.content then
    if old.created_at < now() - interval '15 minutes' then
      raise exception 'Posts can only be edited in the first 15 minutes.' using errcode = 'check_violation';
    end if;
    new.edited_at := now();
  end if;
  return new;
end;
$$;
create trigger posts_guard_edit before update of content on public.posts
  for each row execute function public.guard_post_edit();

-- One pinned post per member, which must be their own.
alter table public.profiles add column pinned_post_id uuid references public.posts(id) on delete set null;

create function public.guard_pinned_post() returns trigger language plpgsql as $$
begin
  if new.pinned_post_id is not null and not exists (select 1 from public.posts p where p.id = new.pinned_post_id and p.user_id = new.id) then
    raise exception 'You can only pin your own post.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_pinned before update of pinned_post_id on public.profiles
  for each row execute function public.guard_pinned_post();

commit;
