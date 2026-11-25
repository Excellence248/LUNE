import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requireViewer } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';

// Saves or un-saves (toggles) a post in your private bookmarks. Returns { active }.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  await rateLimit('react', profile.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  const [ready] = await sql`select to_regclass('public.bookmarks') is not null as ok`;
  if (!ready?.ok) throw new HTTPError('Bookmarks aren’t available yet. Please try again soon.', { status: 503 });
  const removed = await sql`delete from public.bookmarks where user_id = ${profile.id} and post_id = ${id} returning post_id`;
  if (removed.length) return { active: false };
  try {
    await sql`insert into public.bookmarks (user_id, post_id) values (${profile.id}, ${id}) on conflict do nothing`;
  } catch (error) {
    if ((error as { code?: string }).code === '23503') throw new HTTPError('This post no longer exists.', { status: 404 });
    throw error;
  }
  return { active: true };
});
