import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';
import { sql } from '../../../utils/db';

// Body: { content, image_url? } where image_url is an image the caller uploaded to /api/media.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.create');
  await rateLimit('post', me.id);
  const body = ((await readBody<{ content?: unknown; image_url?: unknown }>(event)) ?? {}) as { content?: unknown; image_url?: unknown };
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const image = typeof body.image_url === 'string' ? body.image_url : null;
  if (content.length > 2000) throw new HTTPError('Posts must be 2,000 characters or fewer.', { status: 400 });
  if (!content && !image) throw new HTTPError('Write something or attach an image.', { status: 400 });
  await enforceCivility(me.id, 'post', content);
  if (image) {
    const id = /^\/api\/media\/([0-9a-f-]{36})$/.exec(image)?.[1];
    const [owned] = id ? await sql`select 1 from public.media where id = ${id} and owner_id = ${me.id}` : [];
    if (!owned) throw new HTTPError('Upload the image again, then retry.', { status: 400 });
  }
  const [row] = await sql`
    insert into public.posts (user_id, content, image_url) values (${me.id}, ${content}, ${image})
    returning public.post_json(posts.*) as post`;
  return row.post;
});
