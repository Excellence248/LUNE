import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { PAGE_SIZE, listParams, paged } from '../../../utils/admin';
import { sql } from '../../../utils/db';

// Members with their counts, role, badge, open suspension and sign-in email (admins only).
export default defineHandler(async (event) => {
  await requirePermission(event, 'admin.panel');
  const { offset, q, like } = listParams(event);
  const rows = await sql`
    select p.id, p.username, public.avatar_src(p) as avatar_url, p.created_at,
      to_jsonb(s) - 'profile_id' as stats,
      exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role = 'admin') as is_admin,
      (select jsonb_build_object('reason', x.reason, 'created_at', x.created_at, 'expires_at', x.expires_at)
        from public.profile_suspensions x
        where x.profile_id = p.id and x.lifted_at is null and (x.expires_at is null or x.expires_at > now())) as suspension,
      b.tier as badge, b.expires_at as badge_expires_at,
      u.email
    from public.profiles p
    join public.profile_stats s on s.profile_id = p.id
    left join public.user_badges b on b.user_id = p.id
    left join public.profile_accounts a on a.profile_id = p.id
    left join neon_auth."user" u on u.id = a.neon_auth_user_id
    where ${q} = '' or p.username ilike ${like}
    order by p.created_at desc, p.id desc
    limit ${PAGE_SIZE + 1} offset ${offset}`;
  return paged(rows);
});
