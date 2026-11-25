import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam, readBody } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { requirePermission } from '../../../../utils/auth';
import { sql } from '../../../../utils/db';
import { rateLimit } from '../../../../utils/limits';

// Body: { option } (0-based). Votes in the post's poll; one vote per member, final. Returns the poll.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'post.react');
  await rateLimit('react', me.id);
  const id = uuidParam(getRouterParam(event, 'id'));
  const { option } = ((await readBody<{ option?: unknown }>(event)) ?? {}) as { option?: unknown };
  if (!Number.isInteger(option) || (option as number) < 0 || (option as number) > 3) throw new HTTPError('Choose an option.', { status: 400 });
  const [ready] = await sql`select to_regclass('public.polls') is not null as ok`;
  if (!ready?.ok) throw new HTTPError('Polls aren’t available yet.', { status: 503 });
  try {
    await sql`insert into public.poll_votes (post_id, user_id, option) values (${id}, ${me.id}, ${option as number})`;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') throw new HTTPError('You already voted in this poll.', { status: 409 });
    if (code === '23503') throw new HTTPError('This poll no longer exists.', { status: 404 });
    if (code === '23514' || code === '42501') throw new HTTPError((error as Error).message, { status: code === '42501' ? 403 : 400 });
    throw error;
  }
  const [row] = await sql`
    select jsonb_build_object('options', to_jsonb(pl.options), 'closes_at', pl.closes_at,
      'votes', coalesce((select jsonb_agg(jsonb_build_object('user_id', v.user_id, 'option', v.option)) from public.poll_votes v where v.post_id = pl.post_id), '[]'::jsonb)) as poll
    from public.polls pl where pl.post_id = ${id}`;
  return row.poll;
});
