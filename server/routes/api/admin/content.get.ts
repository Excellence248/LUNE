import { defineHandler } from 'nitro';
import { requirePermission } from '../../../utils/auth';
import { PAGE_SIZE, listParams, paged } from '../../../utils/admin';
import { sql } from '../../../utils/db';

// Newest posts (default) or replies (?kind=replies), optionally filtered by text or author.
export default defineHandler(async (event) => {
  await requirePermission(event, 'admin.panel');
  const { offset, q, like, kind } = listParams(event);
  const rows = kind === 'replies'
    ? await sql`
        select r.id, r.content, null as image_url, r.created_at, r.post_id,
          jsonb_build_object('id', p.id, 'username', p.username) as author
        from public.replies r join public.profiles p on p.id = r.user_id
        where ${q} = '' or r.content ilike ${like} or p.username ilike ${like}
        order by r.created_at desc, r.id desc
        limit ${PAGE_SIZE + 1} offset ${offset}`
    : await sql`
        select po.id, po.content, po.image_url, po.created_at, null as post_id,
          jsonb_build_object('id', p.id, 'username', p.username) as author,
          (select count(*) from public.likes l where l.post_id = po.id)::int as likes,
          (select count(*) from public.reposts r where r.post_id = po.id)::int as reposts,
          (select count(*) from public.replies r where r.post_id = po.id)::int as replies
        from public.posts po join public.profiles p on p.id = po.user_id
        where ${q} = '' or po.content ilike ${like} or p.username ilike ${like}
        order by po.created_at desc, po.id desc
        limit ${PAGE_SIZE + 1} offset ${offset}`;
  return paged(rows);
});
