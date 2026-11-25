import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../../utils/admin';
import { sql } from '../../../../utils/db';

// Tips on a post: how many, the total in USDC, and whether its author can receive tips at all.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'no-store');
  const id = uuidParam(getRouterParam(event, 'id'));
  const [post] = await sql`select (p.wallet_address is not null) as can_receive from public.posts po join public.profiles p on p.id = po.user_id where po.id = ${id}`;
  if (!post) throw new HTTPError('Post not found', { status: 404 });
  const [ready] = await sql`select to_regclass('public.tips') is not null as ok`;
  if (!ready?.ok) return { available: false, count: 0, total: 0, can_receive: !!post.can_receive };
  const [sum] = await sql`select count(*)::int as count, coalesce(sum(amount_usdc), 0)::float as total from public.tips where post_id = ${id} and status = 'paid'`;
  return { available: true, count: sum.count, total: sum.total, can_receive: !!post.can_receive };
});
