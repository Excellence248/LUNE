import { HTTPError, getCookie, type H3Event } from 'nitro/h3';
import { sql } from './db';
import { ageStatus } from './age';
import { WALLET_COOKIE, readWalletSession } from './wallet';

export interface SessionProfile {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  wallet_address: string | null;
}

export interface Viewer {
  kind: 'email' | 'wallet';
  email: string | null;
  emailVerified: boolean;
  profile: SessionProfile;
}

// The viewer's own profile; avatar_src turns an inline avatar into a cacheable URL.
const profileColumns = (rows: Record<string, unknown>[]) => rows[0] as unknown as SessionProfile | undefined;

/**
 * Who is calling: a wallet session (our signed cookie) or a Neon Auth email session, which Neon Auth
 * verifies itself. Email users get a profile on first sign-in, reclaiming their old Supabase profile
 * when their verified email matches it.
 */
export const getViewer = async (event: H3Event): Promise<Viewer | null> => {
  const wallet = readWalletSession(getCookie(event, WALLET_COOKIE));
  if (wallet) {
    const profile = profileColumns(await sql`
      select p.id, p.username, p.bio, public.avatar_src(p) as avatar_url, p.wallet_address
      from public.profiles p where p.id = ${wallet.profileId} and p.wallet_address = ${wallet.wallet}`);
    if (profile?.id) return { kind: 'wallet', email: null, emailVerified: false, profile };
  }

  const cookie = event.req.headers.get('cookie');
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!cookie || !base) return null;
  const res = await fetch(`${base}/get-session`, { headers: { cookie } });
  if (!res.ok) throw new HTTPError('Sign-in service unavailable', { status: 503 });
  const data = (await res.json()) as { user?: { id: string; email: string; emailVerified?: boolean } } | null;
  if (!data?.user?.id) return null;
  const { id, email, emailVerified = false } = data.user;
  const profile = profileColumns(await sql`
    select p.id, p.username, p.bio, public.avatar_src(p) as avatar_url, p.wallet_address
    from public.ensure_email_profile(${id}, ${email}, ${emailVerified}) p`);
  // A deleted account's cached session resolves to no profile.
  return profile?.id ? { kind: 'email', email, emailVerified, profile } : null;
};

/** Throws 403 unless the member has confirmed they are old enough. */
const requireAdult = async (profileId: string) => {
  const status = await ageStatus(profileId);
  if (status === 'required') throw new HTTPError('Confirm your date of birth to continue.', { status: 403 });
  if (status === 'underage') throw new HTTPError('Lune is only for members aged 18 and over.', { status: 403 });
};

/** Returns the caller, or throws 401 when nobody is signed in. */
export const requireViewer = async (event: H3Event) => {
  const viewer = await getViewer(event);
  if (!viewer) throw new HTTPError('Sign in to continue', { status: 401 });
  return viewer;
};

/** Returns the caller's profile, or throws 401 (not signed in) / 403 (lacks the permission, e.g. suspended). */
export const requirePermission = async (event: H3Event, permission: string) => {
  const { profile } = await requireViewer(event);
  const [{ allowed }] = (await sql`select public.has_permission(${profile.id}, ${permission}) as allowed`) as { allowed: boolean }[];
  if (!allowed) throw new HTTPError('You do not have access to this', { status: 403 });
  await requireAdult(profile.id);
  return profile;
};

/** Like requireViewer, for actions with no permission of their own (payments, Spaces) that still need an adult. */
export const requireAdultViewer = async (event: H3Event) => {
  const viewer = await requireViewer(event);
  await requireAdult(viewer.profile.id);
  return viewer;
};
