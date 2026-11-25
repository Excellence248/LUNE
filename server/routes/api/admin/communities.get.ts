import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { PAGE_SIZE, listParams, paged } from '../../../utils/admin';
import { sql } from '../../../utils/db';

// Communities, newest first, optionally filtered by name, address, description or owner.
export default defineHandler(async (event) => {
  await requirePermission(event, 'admin.panel');
  const { offset, q, like } = listParams(event);
  const [ready] = await sql`select to_regclass('public.communities') is not null as ok`;
  if (!ready?.ok) return { items: [], hasMore: false };
  const rows = await sql`
    select c.id, c.slug, c.name, c.description, c.created_at,
      jsonb_build_object('id', o.id, 'username', o.username) as owner,
      (select count(*) from public.community_members m where m.community_id = c.id)::int as members,
      (select count(*) from public.posts po where po.community_id = c.id)::int as posts
    from public.communities c join public.profiles o on o.id = c.owner_id
    where ${q} = '' or c.name ilike ${like} or c.slug ilike ${like} or c.description ilike ${like} or o.username ilike ${like}
    order by c.created_at desc, c.id desc
    limit ${PAGE_SIZE + 1} offset ${offset}`;
  return paged(rows);
});
