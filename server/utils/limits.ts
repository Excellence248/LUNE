import { HTTPError, type H3Event } from 'nitro/h3';
import { sql } from './db';

/** [max requests, window in seconds] per member (or per IP before sign-in). */
export const LIMITS = {
  post: [10, 600],
  reply: [30, 600],
  react: [120, 600],
  follow: [60, 600],
  block: [60, 3600],
  report: [20, 3600],
  profile: [30, 3600],
  upload: [20, 3600],
  payment: [20, 3600],
  spaceSend: [1200, 60],
  spacePoll: [180, 60],
  walletNonce: [20, 600],
  walletVerify: [20, 600],
  signUp: [5, 3600],
  signIn: [20, 600],
  authEmail: [5, 3600],
} as const satisfies Record<string, readonly [number, number]>;

/** The caller's IP as Vercel reports it; "local" in development. */
export const clientIp = (event: H3Event) =>
  event.req.headers.get('x-real-ip') || event.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

/** Throws 429 once `who` has used `action` more often than LIMITS allows in the current window. */
export const rateLimit = async (action: keyof typeof LIMITS, who: string) => {
  const [max, windowSeconds] = LIMITS[action];
  const [{ allowed }] = (await sql`select public.hit_rate_limit(${`${action}:${who}`}, ${max}, ${windowSeconds}) as allowed`) as { allowed: boolean }[];
  if (Math.random() < 0.01) await sql`delete from public.rate_limits where window_start < now() - interval '1 day'`;
  if (!allowed) throw new HTTPError('You’re doing that too often. Wait a few minutes and try again.', { status: 429 });
};
