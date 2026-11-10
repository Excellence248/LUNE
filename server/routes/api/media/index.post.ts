import { defineHandler } from 'nitro';
import { HTTPError } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { sniffImage } from '../../../utils/images';
import { rateLimit } from '../../../utils/limits';

// Vercel caps request bodies at 4.5 MB, so uploads stop at 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;
// Total image storage per member.
const QUOTA_BYTES = 100 * 1024 * 1024;

// Body: the raw image file (JPG, PNG, WebP or GIF). Returns { id, url } to use as a post's image_url.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.create');
  await rateLimit('upload', me.id);
  const bytes = new Uint8Array(await event.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new HTTPError('Choose an image up to 4 MB.', { status: 413 });
  const type = sniffImage(bytes);
  if (!type) throw new HTTPError('Choose a JPG, PNG, WebP, or GIF image.', { status: 415 });
  // Images that never made it into a post or avatar are deleted after a day.
  if (Math.random() < 0.05) await sql`select public.delete_orphan_media()`;
  const [{ used }] = await sql`select coalesce(sum(size), 0)::bigint as used from public.media where owner_id = ${me.id}`;
  if (Number(used) + bytes.length > QUOTA_BYTES) throw new HTTPError('You have reached your image storage limit. Delete some image posts first.', { status: 413 });
  const [row] = await sql`
    insert into public.media (owner_id, content_type, bytes) values (${me.id}, ${type}, ${'\\x' + Buffer.from(bytes).toString('hex')}::bytea)
    returning id`;
  return { id: row.id, url: `/api/media/${row.id}` };
});
