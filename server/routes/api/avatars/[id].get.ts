import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { sql } from '../../../utils/db';
import { imageHeaders } from '../../../utils/images';

const INLINE = /^data:(image\/(?:jpeg|png|webp|gif|svg\+xml));(base64|utf8),(.*)$/s;

// Serves an avatar stored inline in profiles.avatar_url. URLs carry ?v=, so they can be cached forever.
export default defineHandler(async (event) => {
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`select avatar_url from public.profiles where id = ${id}`;
  const match = row ? INLINE.exec(row.avatar_url) : null;
  if (!match) throw new HTTPError('Avatar not found', { status: 404 });
  const [, type, encoding, data] = match;
  const bytes = encoding === 'base64' ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data));
  return new Response(bytes, { headers: imageHeaders(type) });
});
