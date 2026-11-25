import { defineHandler } from 'nitro';
import { HTTPError, getQuery, getRouterParam } from 'nitro/h3';
import { sql } from '../../../../utils/db';
import { withFeedFeatures } from '../../../../utils/feed';

// A member's posts (?kind=posts) or the posts they reposted (?kind=reposts), newest first. ?limit= up to 200.
export default defineHandler(async (event) => {
  const username = getRouterParam(event, 'username', { decode: true }) ?? '';
  const query = getQuery(event) as Record<string, string | undefined>;
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 200);
  const [profile] = await sql`select id from public.profiles where lower(username) = lower(${username})`;
  if (!profile) throw new HTTPError('Profile not found', { status: 404 });
  const rows = query.kind === 'reposts'
    ? await sql`
        select public.post_json(po) as post from public.reposts r join public.posts po on po.id = r.post_id
        where r.user_id = ${profile.id} order by r.created_at desc, po.id desc limit ${limit + 1}`
    // First posts only: the follow-ups of a thread open from their first post. A pinned post comes first.
    : await withFeedFeatures(async features => {
        const [pinning] = await sql`select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'pinned_post_id') as ok`;
        const pinned = pinning?.ok ? '(select pr.pinned_post_id from public.profiles pr where pr.id = $1)' : 'null::uuid';
        return sql.query(
          `select public.post_json(po) || jsonb_build_object('pinned', po.id is not distinct from ${pinned}) as post from public.posts po
           where po.user_id = $1 ${features.threads ? 'and po.thread_root_id is null' : ''}
           order by (po.id is not distinct from ${pinned}) desc, po.created_at desc, po.id desc limit $2`, [profile.id, limit + 1]);
      });
  event.res.headers.set('Cache-Control', 'no-store');
  return { items: rows.slice(0, limit).map(row => row.post), hasMore: rows.length > limit };
});
