import { HTTPError, type H3Event } from 'nitro/h3';
import { sql } from './db';

export interface SessionProfile {
  id: string;
  username: string;
}

/**
 * Resolves the signed-in Neon Auth user and the Lune profile linked to it in profile_accounts.
 * The session is checked by Neon Auth itself, so a forged cookie never gets past this point.
 */
export const getSession = async (event: H3Event) => {
  const cookie = event.req.headers.get('cookie');
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!cookie || !base) return null;
  const res = await fetch(`${base}/get-session`, { headers: { cookie } });
  if (!res.ok) throw new HTTPError('Sign-in service unavailable', { status: 503 });
  const data = (await res.json()) as { user?: { id: string; email: string } } | null;
  if (!data?.user?.id) return null;
  const [profile] = (await sql`
    select p.id, p.username from public.profile_accounts a
    join public.profiles p on p.id = a.profile_id
    where a.neon_auth_user_id = ${data.user.id}`) as SessionProfile[];
  return { authUserId: data.user.id, email: data.user.email, profile: profile ?? null };
};

/** Returns the caller's profile, or throws 401 (not signed in) / 403 (lacks the permission). */
export const requirePermission = async (event: H3Event, permission: string) => {
  const session = await getSession(event);
  if (!session) throw new HTTPError('Sign in to continue', { status: 401 });
  if (!session.profile) throw new HTTPError(`This sign-in is not linked to a Lune profile yet. Its Neon Auth user ID is ${session.authUserId}.`, { status: 403 });
  const [{ allowed }] = (await sql`select public.has_permission(${session.profile.id}, ${permission}) as allowed`) as { allowed: boolean }[];
  if (!allowed) throw new HTTPError('You do not have access to this', { status: 403 });
  return session.profile;
};
