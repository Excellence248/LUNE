import { defineHandler } from 'nitro';
import { HTTPError, getQuery, getRouterParam } from 'nitro/h3';
import { sql } from '../../../../utils/db';

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
    : await sql`
        select public.post_json(po) as post from public.posts po
        where po.user_id = ${profile.id} order by po.created_at desc, po.id desc limit ${limit + 1}`;
  event.res.headers.set('Cache-Control', 'no-store');
  return { items: rows.slice(0, limit).map(row => row.post), hasMore: rows.length > limit };
});
