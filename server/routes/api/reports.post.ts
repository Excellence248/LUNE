import { defineHandler } from 'nitro';
import { HTTPError, readBody } from 'nitro/h3';
import { requirePermission } from '../../utils/auth';
import { sql } from '../../utils/db';
import { rateLimit } from '../../utils/limits';

const REASONS = ['spam', 'harassment', 'hate', 'violence', 'sexual', 'scam', 'impersonation', 'other'];
interface Body { target_type?: unknown; target_id?: unknown; reason?: unknown; details?: unknown }

// Body: { target_type: 'post' | 'reply' | 'profile', target_id, reason, details? }. Admins see it in the panel.
export default defineHandler(async (event) => {
  const me = await requirePermission(event, 'report.create');
  await rateLimit('report', me.id);
  const body = ((await readBody<Body>(event)) ?? {}) as Body;
  const type = body.target_type;
  const id = typeof body.target_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.target_id) ? body.target_id : null;
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  if ((type !== 'post' && type !== 'reply' && type !== 'profile') || !id) throw new HTTPError('Choose something to report.', { status: 400 });
  if (typeof body.reason !== 'string' || !REASONS.includes(body.reason)) throw new HTTPError('Choose a reason.', { status: 400 });
  if (details.length > 1000) throw new HTTPError('Keep the details under 1,000 characters.', { status: 400 });
  const [target] = type === 'post'
    ? await sql`select user_id as owner from public.posts where id = ${id}`
    : type === 'reply'
      ? await sql`select user_id as owner from public.replies where id = ${id}`
      : await sql`select id as owner from public.profiles where id = ${id}`;
  if (!target) throw new HTTPError('That no longer exists.', { status: 404 });
  if (target.owner === me.id) throw new HTTPError('You can’t report yourself.', { status: 400 });
  try {
    await sql`
      insert into public.reports (reporter_id, target_type, target_id, target_profile_id, reason, details)
      values (${me.id}, ${type}, ${id}, ${target.owner}, ${body.reason}, ${details})`;
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new HTTPError('You already reported this. The admins will review it.', { status: 409 });
    throw error;
  }
  return { ok: true };
});
