-- JSON shapes and payment confirmation used by the server API. Run after 20261110_app_cutover.sql.

begin;

-- Inline (data URL) avatars are served from /api/avatars/:id instead of being repeated in every
-- response. The version parameter changes whenever the profile does, so browsers can cache forever.
create function public.avatar_src(p public.profiles) returns text language sql stable as $$
  select case when p.avatar_url like 'data:%'
    then '/api/avatars/' || p.id || '?v=' || floor(extract(epoch from p.updated_at))::bigint
    else p.avatar_url end;
$$;

create function public.author_json(p public.profiles) returns jsonb language sql stable as $$
  select jsonb_build_object('username', p.username, 'avatar_url', public.avatar_src(p), 'wallet_address', p.wallet_address);
$$;

create function public.reply_json(r public.replies) returns jsonb language sql stable as $$
  select to_jsonb(r) || jsonb_build_object('profiles', (select public.author_json(a) from public.profiles a where a.id = r.user_id));
$$;

-- The post shape the app renders: author, who liked and reposted, and replies oldest first.
create function public.post_json(po public.posts) returns jsonb language sql stable as $$
  select to_jsonb(po) || jsonb_build_object(
    'profiles', (select public.author_json(a) from public.profiles a where a.id = po.user_id),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id)) from public.likes l where l.post_id = po.id), '[]'::jsonb),
    'reposts', coalesce((select jsonb_agg(jsonb_build_object('user_id', r.user_id)) from public.reposts r where r.post_id = po.id), '[]'::jsonb),
    'replies', coalesce((select jsonb_agg(public.reply_json(rp) order by rp.created_at, rp.id) from public.replies rp where rp.post_id = po.id), '[]'::jsonb)
  );
$$;

-- Marks a verified on-chain payment as paid and extends the buyer's badge, atomically.
-- The unique signature makes one transaction pay for at most one order; non-expiring badges stay
-- non-expiring, and an active gold badge is never downgraded.
create function public.confirm_crypto_order(ref text, buyer uuid, sig text) returns public.user_badges language plpgsql as $$
declare
  o public.crypto_orders;
  b public.user_badges;
begin
  update public.crypto_orders set status = 'paid', signature = sig, paid_at = now()
  where reference = ref and user_id = buyer and status = 'pending'
  returning * into o;
  if o.reference is null then
    raise exception 'Order is not pending' using errcode = 'no_data_found';
  end if;
  select * into b from public.user_badges where user_id = buyer for update;
  if found and b.expires_at is null then
    update public.user_badges set tier = case when b.tier = 'gold' then 'gold' else o.tier end, granted_at = now()
    where user_id = buyer returning * into b;
    return b;
  end if;
  insert into public.user_badges (user_id, tier, expires_at, granted_at)
  values (
    buyer,
    case when b.tier = 'gold' and b.expires_at > now() then 'gold' else o.tier end,
    greatest(now(), coalesce(b.expires_at, now())) + interval '30 days',
    now()
  )
  on conflict (user_id) do update set tier = excluded.tier, expires_at = excluded.expires_at, granted_at = excluded.granted_at
  returning * into b;
  return b;
end;
$$;

commit;
