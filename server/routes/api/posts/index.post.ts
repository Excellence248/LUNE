import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../../utils/auth';
import { feedFeatures } from '../../../utils/feed';
import { rateLimit } from '../../../utils/limits';
import { enforceCivility } from '../../../utils/moderation';
import { sql } from '../../../utils/db';

const MEDIA_PATH = /^\/api\/media\/([0-9a-f-]{36})$/;
const MAX_PARTS = 10;
const MAX_PICTURES = 10;

interface PartInput { content?: unknown; images?: unknown }
interface Body { content?: unknown; image_url?: unknown; images?: unknown; parts?: unknown; community?: unknown }

// Publishes a post, or a whole thread, with up to 10 pictures each.
//   { parts: [{ content, images: ['/api/media/<id>', …] }, …], community?: slug }
//     parts[0] is the post and the rest are its follow-ups (a thread of up to 10 posts).
//   { content, image_url? }   the original single-post form, still accepted.
// Pictures must be ones the caller uploaded to /api/media. Every part is checked by the hate-speech filter.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.create');
  await rateLimit('post', me.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;

  // Both forms become a list of parts.
  const inputs: PartInput[] = Array.isArray(body.parts)
    ? (body.parts as PartInput[])
    : [{ content: body.content, images: Array.isArray(body.images) ? body.images : typeof body.image_url === 'string' && body.image_url ? [body.image_url] : [] }];
  if (!inputs.length || inputs.length > MAX_PARTS) throw new HTTPError(`A thread has 1 to ${MAX_PARTS} posts.`, { status: 400 });
  if (inputs.length > 1) await rateLimit('thread', me.id);

  const parts = inputs.map((input, index) => {
    const content = typeof input?.content === 'string' ? input.content.trim() : '';
    const raw = Array.isArray(input?.images) ? input.images : [];
    if (raw.some(picture => typeof picture !== 'string' || !MEDIA_PATH.test(picture))) throw new HTTPError('Upload your pictures again, then retry.', { status: 400 });
    const images = [...new Set(raw as string[])];
    const label = inputs.length > 1 ? ` (post ${index + 1})` : '';
    if (content.length > 2000) throw new HTTPError(`Posts must be 2,000 characters or fewer${label}.`, { status: 400 });
    if (images.length > MAX_PICTURES) throw new HTTPError(`A post can have up to ${MAX_PICTURES} pictures${label}.`, { status: 400 });
    if (!content && !images.length) throw new HTTPError(`Write something or attach a picture${label}.`, { status: 400 });
    return { content, images };
  });

  const features = await feedFeatures();
  if (parts.length > 1 && !features.threads) throw new HTTPError('Threads aren’t available yet.', { status: 400 });
  if (!features.images && parts.some(part => part.images.length > 1)) throw new HTTPError('Posting several pictures isn’t available yet.', { status: 400 });
  if (body.community != null && !features.communities) throw new HTTPError('Communities aren’t available yet.', { status: 400 });

  for (const part of parts) if (part.content) await enforceCivility(me.id, 'post', part.content);

  // Every picture must be the caller's own upload.
  const ids = [...new Set(parts.flatMap(part => part.images.map(picture => MEDIA_PATH.exec(picture)![1])))];
  if (ids.length) {
    const owned = await sql`select id from public.media where id = any(${ids}::uuid[]) and owner_id = ${me.id}`;
    if (owned.length !== ids.length) throw new HTTPError('Upload your pictures again, then retry.', { status: 400 });
  }

  let community: string | null = null;
  if (body.community != null) {
    const slug = typeof body.community === 'string' ? body.community.toLowerCase() : '';
    const [found] = await sql`select id from public.communities where lower(slug) = ${slug}`;
    if (!found) throw new HTTPError('That community doesn’t exist.', { status: 404 });
    community = found.id as string;
  }

  try {
    let rootId: string;
    if (features.threads) {
      const [created] = await sql`select public.create_post_thread(${me.id}, ${community}, ${JSON.stringify(parts)}::jsonb) as id`;
      rootId = created.id as string;
    } else {
      // The original single post, for a database without the new columns.
      const [created] = await sql`insert into public.posts (user_id, content, image_url) values (${me.id}, ${parts[0].content}, ${parts[0].images[0] ?? null}) returning id`;
      rootId = created.id as string;
    }
    const [row] = await sql`select public.post_json(po) as post from public.posts po where po.id = ${rootId}`;
    return row.post;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Raised by the database: not a member of the community.
    if (code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    if (code === '23514') throw new HTTPError((error as Error).message, { status: 400 });
    throw error;
  }
});
