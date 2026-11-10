import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';

// Body: { ids?: string[] } — marks those (or, without ids, all) of the caller's notifications read.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const { ids } = ((await readBody<{ ids?: unknown }>(event)) ?? {}) as { ids?: unknown };
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 500 || !ids.every(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))) {
    throw new HTTPError('ids must be a list of notification IDs', { status: 400 });
  }
  const rows = ids
    ? await sql`update public.notifications set read = true where user_id = ${profile.id} and read = false and id = any(${ids}::uuid[]) returning id`
    : await sql`update public.notifications set read = true where user_id = ${profile.id} and read = false returning id`;
  return rows.map(row => row.id as string);
});
