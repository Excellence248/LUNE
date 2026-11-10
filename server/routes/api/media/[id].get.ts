import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { sql } from '../../../utils/db';
import { imageHeaders } from '../../../utils/images';

export default defineHandler(async (event) => {
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`select content_type, encode(bytes, 'base64') as data from public.media where id = ${id}`;
  if (!row) throw new HTTPError('Image not found', { status: 404 });
  return new Response(Buffer.from(row.data, 'base64'), { headers: imageHeaders(row.content_type) });
});
