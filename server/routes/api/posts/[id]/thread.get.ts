import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { sql } from '../../../../utils/db';
import { feedFeatures } from '../../../../utils/feed';

// A whole thread, in order: pass the ID of its first post or of any follow-up. A post that is not part of
// a thread comes back as a list of one.
export default defineHandler(async (event) => {
  const id = uuidParam(getRouterParam(event, 'id'));
  const features = await feedFeatures();
  event.res.headers.set('Cache-Control', 'no-store');
  if (!features.threads) {
    const [row] = await sql`select public.post_json(po) as post from public.posts po where po.id = ${id}`;
    if (!row) throw new HTTPError('Post not found', { status: 404 });
    return { items: [row.post], root_id: id };
  }
  const rows = await sql`
    select public.post_json(po) as post, t.root
    from public.posts po
    join (select coalesce(thread_root_id, id) as root from public.posts where id = ${id}) t
      on po.id = t.root or po.thread_root_id = t.root
    order by po.thread_position, po.created_at`;
  if (!rows.length) throw new HTTPError('Post not found', { status: 404 });
  return { items: rows.map(row => row.post), root_id: rows[0].root };
});
