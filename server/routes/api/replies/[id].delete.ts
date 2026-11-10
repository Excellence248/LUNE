import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requirePermission } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Deletes one of the caller's own replies.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'reply.delete_own');
  const id = uuidParam(getRouterParam(event, 'id'));
  const [row] = await sql`delete from public.replies where id = ${id} and user_id = ${me.id} returning id`;
  if (!row) throw new HTTPError('Reply not found', { status: 404 });
  return { ok: true };
});
