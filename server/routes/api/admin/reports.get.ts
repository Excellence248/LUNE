import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { PAGE_SIZE, listParams, paged } from '../../../utils/admin';
import { sql } from '../../../utils/db';

// Reports, newest first (?status=open|resolved|dismissed, default open), with what was reported.
export default defineHandler(async (event) => {
  await requirePermission(event, 'admin.panel');
  const { offset } = listParams(event);
  const status = ['open', 'resolved', 'dismissed'].includes(String(getQuery(event).status)) ? String(getQuery(event).status) : 'open';
  const rows = await sql`
    select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, r.resolved_at,
      rp.username as reporter_username, tp.username as target_username, r.target_profile_id,
      coalesce(po.content, re.content) as content, po.image_url,
      (po.id is null and re.id is null and r.target_type <> 'profile') as removed,
      (select count(*) from public.reports o where o.target_type = r.target_type and o.target_id = r.target_id and o.status = 'open')::int as open_reports
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_profile_id
    left join public.posts po on r.target_type = 'post' and po.id = r.target_id
    left join public.replies re on r.target_type = 'reply' and re.id = r.target_id
    where r.status = ${status}
    order by r.created_at desc, r.id desc
    limit ${PAGE_SIZE + 1} offset ${offset}`;
  return paged(rows);
});
