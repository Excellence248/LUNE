-- Reserved names. A reserved name can only be used by its owner, as a username and as a display name,
-- so nobody can register "Sammy" (or "S_a_m_m_y", "SAMMY", or a display name of "Sammy ✨") to pose
-- as a founder. Names are compared after lower-casing and dropping everything that is not a letter or
-- digit. A name with no owner is reserved for everyone.

begin;

create table public.reserved_names (
  normalized text primary key check (normalized ~ '^[a-z0-9]{3,64}$'),
  owner_id uuid references public.profiles(id) on delete set null,
  note text not null default ''
);

create function public.normalize_name(value text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(value, ''), '[^[:alnum:]]', '', 'g'));
$$;

create function public.guard_reserved_names() returns trigger language plpgsql as $$
declare
  r public.reserved_names;
begin
  select * into r from public.reserved_names where normalized = public.normalize_name(new.username);
  if found and r.owner_id is distinct from new.id then
    raise exception 'That username is already taken.' using errcode = 'unique_violation';
  end if;
  if new.display_name <> '' then
    select * into r from public.reserved_names where normalized = public.normalize_name(new.display_name);
    if found and r.owner_id is distinct from new.id then
      raise exception 'That name is reserved.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard_reserved_names before insert or update of username, display_name on public.profiles
  for each row execute function public.guard_reserved_names();

-- The founders. Each name belongs to the founder's current account (null if that account is not found).
insert into public.reserved_names (normalized, owner_id, note) values
  ('sammy', (select id from public.profiles where lower(username) = 'sammyswago'), 'Founder'),
  ('sammyswago', (select id from public.profiles where lower(username) = 'sammyswago'), 'Founder'),
  ('excellence248', (select id from public.profiles where lower(username) = 'excellence248'), 'Founder');

commit;
