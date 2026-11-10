import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// ?q= searches usernames (up to 10 matches); without q, returns up to ?limit= (max 40) other members
// to suggest following, newest first.
export default defineHandler(async (event) => {
  const query = getQuery(event) as Record<string, string | undefined>;
  const q = (query.q ?? '').trim().replace(/^@/, '');
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 40);
  if (q) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(q)) return [];
    return sql`
      select p.id, p.username, public.avatar_src(p) as avatar_url, p.bio, p.wallet_address from public.profiles p
      where p.username ilike ${`%${q.replace(/_/g, '\\_')}%`}
      order by p.username limit 10`;
  }
  const viewer = await getViewer(event);
  return sql`
    select p.id, p.username, public.avatar_src(p) as avatar_url, p.bio, p.wallet_address from public.profiles p
    where p.id is distinct from ${viewer?.profile.id ?? null}::uuid and not public.is_suspended(p.id)
    order by p.created_at desc limit ${limit}`;
});
