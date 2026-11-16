import { defineHandler } from 'nitro';
import { getQuery } from 'nitro/h3';
import { getViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// ?q= searches usernames and display names (up to 10 matches); without q, returns up to ?limit= (max 40)
// other members to suggest following, newest first.
export default defineHandler(async (event) => {
  const query = getQuery(event) as Record<string, string | undefined>;
  const q = (query.q ?? '').trim().replace(/^@/, '');
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 40);
  if (q) {
    if (q.length > 64) return [];
    // Escape LIKE wildcards so "_" in "Excellence_248" matches only itself.
    const like = `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`;
    return sql`
      select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url, p.bio, p.wallet_address from public.profiles p
      where p.username ilike ${like} or p.display_name ilike ${like}
      order by (lower(p.username) = lower(${q})) desc, p.username limit 10`;
  }
  const viewer = await getViewer(event);
  return sql`
    select p.id, p.username, p.display_name, public.avatar_src(p) as avatar_url, p.bio, p.wallet_address from public.profiles p
    where p.id is distinct from ${viewer?.profile.id ?? null}::uuid and not public.is_suspended(p.id)
    order by p.created_at desc limit ${limit}`;
});
