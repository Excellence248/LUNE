import { defineHandler } from 'nitro';
import { HTTPError, deleteCookie, readBody } from 'nitro/h3';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { WALLET_COOKIE } from '../../../utils/wallet';

// Body: { confirm: <your username> }. Permanently deletes the caller's profile, posts, replies,
// likes, follows, images and email sign-in. Reports and admin history about them are kept.
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const { confirm } = ((await readBody<{ confirm?: unknown }>(event)) ?? {}) as { confirm?: unknown };
  if (confirm !== profile.username) throw new HTTPError('Type your username exactly to confirm.', { status: 400 });
  try {
    await sql`select public.delete_own_account(${profile.id})`;
  } catch (error) {
    if ((error as { code?: string }).code === '42501') throw new HTTPError((error as Error).message, { status: 403 });
    throw error;
  }
  deleteCookie(event, WALLET_COOKIE, { path: '/' });
  return { ok: true };
});
