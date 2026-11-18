-- One-to-one voice and video calls.
--
-- Media flows directly between the two browsers (WebRTC). The server only keeps the call record and
-- passes the small connection messages (offer, answer, ICE candidates) between the two members, which
-- poll for them. A call rings for 45 seconds; an active call ends by itself when either side stops
-- checking in for 20 seconds (closed tab, lost connection).

begin;

insert into public.permissions (name, description) values ('call.start', 'Start voice and video calls');
insert into public.role_permissions (role, permission) values ('member', 'call.start');

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended')),
  end_reason text check (end_reason in ('hangup', 'declined', 'missed', 'cancelled', 'failed', 'dropped')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  caller_seen timestamptz not null default now(),
  callee_seen timestamptz not null default now(),
  check (caller_id <> callee_id),
  check ((status = 'ended') = (ended_at is not null))
);
create index calls_caller_open on public.calls (caller_id) where status <> 'ended';
create index calls_callee_open on public.calls (callee_id) where status <> 'ended';
create index calls_recent on public.calls (created_at desc);

create table public.call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.calls(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'candidate')),
  payload jsonb not null check (pg_column_size(payload) < 16000),
  created_at timestamptz not null default now()
);
create index call_signals_lookup on public.call_signals (call_id, to_id, id);

-- Ends calls nobody is attending: ringing too long, or an active call whose side went quiet.
create function public.sweep_calls() returns void language sql as $$
  update public.calls set
    status = 'ended', ended_at = now(),
    end_reason = case when status = 'ringing' then 'missed' else 'dropped' end
  where status <> 'ended' and (
    (status = 'ringing' and created_at < now() - interval '45 seconds')
    or (status = 'active' and (caller_seen < now() - interval '20 seconds' or callee_seen < now() - interval '20 seconds'))
  );
$$;

-- Starts ringing `callee`. Refused for yourself, a missing member, a suspended caller, a block in
-- either direction, or when either member is already on a call.
create function public.start_call(caller uuid, callee uuid, call_kind text) returns public.calls language plpgsql as $$
declare
  c public.calls;
begin
  if caller = callee then
    raise exception 'You can’t call yourself.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where id = callee) then
    raise exception 'Member not found' using errcode = 'no_data_found';
  end if;
  if public.is_suspended(caller) then
    raise exception 'This account is suspended.' using errcode = 'insufficient_privilege';
  end if;
  if public.is_blocked_between(caller, callee) then
    raise exception 'You can’t call this account.' using errcode = 'insufficient_privilege';
  end if;
  perform public.sweep_calls();
  if exists (select 1 from public.calls where status <> 'ended' and (caller_id in (caller, callee) or callee_id in (caller, callee))) then
    raise exception 'One of you is already on a call.' using errcode = 'lock_not_available';
  end if;
  insert into public.calls (caller_id, callee_id, kind) values (caller, callee, call_kind) returning * into c;
  return c;
end;
$$;

-- The callee accepts (call becomes active) or declines (call ends). Does nothing to a call that is not ringing.
create function public.answer_call(call uuid, me uuid, accept boolean) returns public.calls language plpgsql as $$
declare
  c public.calls;
begin
  perform public.sweep_calls();
  if accept then
    update public.calls set status = 'active', answered_at = now(), caller_seen = now(), callee_seen = now()
    where id = call and callee_id = me and status = 'ringing' returning * into c;
  else
    update public.calls set status = 'ended', ended_at = now(), end_reason = 'declined'
    where id = call and callee_id = me and status = 'ringing' returning * into c;
  end if;
  if c.id is null then
    select * into c from public.calls where id = call and (caller_id = me or callee_id = me);
  end if;
  return c;
end;
$$;

-- Either member hangs up. Idempotent: ending an ended call returns it unchanged.
create function public.end_call(call uuid, me uuid, why text default null) returns public.calls language plpgsql as $$
declare
  c public.calls;
begin
  update public.calls set
    status = 'ended', ended_at = now(),
    end_reason = case
      when status = 'ringing' and caller_id = me then 'cancelled'
      when status = 'ringing' then 'declined'
      when why = 'failed' then 'failed'
      else 'hangup' end
  where id = call and (caller_id = me or callee_id = me) and status <> 'ended' returning * into c;
  if c.id is null then
    select * into c from public.calls where id = call and (caller_id = me or callee_id = me);
  end if;
  return c;
end;
$$;

commit;
