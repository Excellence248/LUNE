import { defineHandler } from 'nitro';
import { HTTPError } from 'nitro/h3';
import { clientIp, rateLimit, type LIMITS } from '../../../utils/limits';

const FORWARD_HEADERS = ['accept', 'content-type', 'cookie', 'origin', 'user-agent'];

// Limits per IP on the Neon Auth calls that create accounts, try passwords or send email.
const LIMITED: Record<string, keyof typeof LIMITS> = {
  '/sign-up/email': 'signUp',
  '/sign-in/email': 'signIn',
  '/send-verification-email': 'authEmail',
  '/request-password-reset': 'authEmail',
  '/reset-password': 'signIn',
  '/email-otp/send-verification-otp': 'authEmail',
  '/forget-password/email-otp': 'authEmail',
  '/email-otp/verify-email': 'signIn',
  '/email-otp/reset-password': 'signIn',
};

// Same-origin proxy to Neon Auth, so its session cookie is first-party and httpOnly on this site.
export default defineHandler(async (event) => {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) throw new HTTPError('Sign-in is not configured', { status: 503 });
  const { method, headers } = event.req;
  const origin = headers.get('origin');
  // Browsers send Origin on cross-site writes; only pages on this site may sign in or out.
  if (method !== 'GET' && method !== 'HEAD' && origin && new URL(origin).host !== headers.get('host')) {
    throw new HTTPError('Cross-site request blocked', { status: 403 });
  }
  const path = event.url.pathname.replace(/^\/api\/auth/, '');
  if (method === 'POST' && LIMITED[path]) await rateLimit(LIMITED[path], clientIp(event));
  const forward = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = headers.get(name);
    if (value) forward.set(name, value);
  }
  const upstream = await fetch(`${base}${path}${event.url.search}`, {
    method,
    headers: forward,
    body: method === 'GET' || method === 'HEAD' ? undefined : await event.req.arrayBuffer(),
    redirect: 'manual',
  });
  const reply = new Headers();
  for (const name of ['content-type', 'cache-control', 'location']) {
    const value = upstream.headers.get(name);
    if (value) reply.set(name, value);
  }
  // Drop Domain so the cookie belongs to this site rather than Neon's.
  for (const cookie of upstream.headers.getSetCookie()) reply.append('set-cookie', cookie.replace(/;\s*domain=[^;]*/gi, ''));
  return new Response(upstream.body, { status: upstream.status, headers: reply });
});
