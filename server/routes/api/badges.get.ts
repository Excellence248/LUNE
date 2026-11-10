import { defineHandler } from 'nitro';
import { sql } from '../../utils/db';

// Active verification badges by username, for the ticks shown next to names.
export default defineHandler(async (event) => {
  event.res.headers.set('Cache-Control', 'public, max-age=60');
  return sql`
    select p.username, b.tier, b.expires_at from public.user_badges b join public.profiles p on p.id = b.user_id
    where b.expires_at is null or b.expires_at > now()`;
});
