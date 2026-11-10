import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { sql } from '../../../utils/db';

export default defineHandler(async (event) => {
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`select public.post_json(po) as post from public.posts po where po.id = ${id}`;
  if (!row) throw new HTTPError('Post not found', { status: 404 });
  event.res.headers.set('Cache-Control', 'no-store');
  return row.post;
});
