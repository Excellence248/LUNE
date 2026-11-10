import { defineHandler } from 'nitro';
import { HTTPError } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { sniffImage } from '../../../utils/images';

// Vercel caps request bodies at 4.5 MB, so uploads stop at 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;

// Body: the raw image file (JPG, PNG, WebP or GIF). Returns { id, url } to use as a post's image_url.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.create');
  const bytes = new Uint8Array(await event.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new HTTPError('Choose an image up to 4 MB.', { status: 413 });
  const type = sniffImage(bytes);
  if (!type) throw new HTTPError('Choose a JPG, PNG, WebP, or GIF image.', { status: 415 });
  const [row] = await sql`
    insert into public.media (owner_id, content_type, bytes) values (${me.id}, ${type}, ${'\\x' + Buffer.from(bytes).toString('hex')}::bytea)
    returning id`;
  return { id: row.id, url: `/api/media/${row.id}` };
});
