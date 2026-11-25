-- Replies to replies and likes on replies, like Twitter. Additive.

begin;

-- A reply can answer another reply on the same post. Deleting a reply removes the replies under it.
alter table public.replies add column parent_id uuid references public.replies(id) on delete cascade;
create index replies_parent_idx on public.replies (parent_id) where parent_id is not null;

create function public.guard_reply_parent() returns trigger language plpgsql as $$
begin
  if new.parent_id is not null then
    if not exists (select 1 from public.replies p where p.id = new.parent_id and p.post_id = new.post_id) then
      raise exception 'The reply you are answering is not on this post.' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.replies p where p.id = new.parent_id and public.is_blocked_between(p.user_id, new.user_id)) then
      raise exception 'You can’t reply to this account.' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
create trigger replies_guard_parent before insert or update of parent_id on public.replies
  for each row execute function public.guard_reply_parent();

-- Likes on replies. The primary key makes a second like impossible.
create table public.reply_likes (
  reply_id uuid not null references public.replies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);
create index reply_likes_user on public.reply_likes (user_id);

create function public.guard_reply_like() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.replies r where r.id = new.reply_id and public.is_blocked_between(r.user_id, new.user_id)) then
    raise exception 'You can’t like this reply.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger reply_likes_guard before insert on public.reply_likes
  for each row execute function public.guard_reply_like();

-- A reply as the app shows it: author, who liked it, and the username it answers (if it answers a reply).
create or replace function public.reply_json(r public.replies) returns jsonb language sql stable as $$
  select to_jsonb(r) || jsonb_build_object(
    'profiles', (select public.author_json(a) from public.profiles a where a.id = r.user_id),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id)) from public.reply_likes l where l.reply_id = r.id), '[]'::jsonb),
    'reply_to_username', (select a.username from public.replies p join public.profiles a on a.id = p.user_id where p.id = r.parent_id)
  );
$$;

commit;
